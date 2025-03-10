import { config } from 'dotenv';
import { Pipeline } from '../command-ingress/feed/pipeline';
import { MongoDBChangeStreamSource } from './feed/source/change_stream';
import { RedisSink } from './feed/sink/redis_sink';
import { TransformDataOperator } from './feed/operator/transform_data';
import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import { mustGetEnv } from '../../lib/env';
import { connectRedis } from '../../lib/redis';
import { createHttpServer } from './app';
import env from './utils/env';

config();

async function connectMongoDB() {
    const databaseUri = mustGetEnv('MONGO_URI');
    const databaseName = mustGetEnv('MONGO_DB_NAME');
    
    let retries = 5;
    let mongoClient;
    
    while (retries > 0) {
        try {
            mongoClient = await MongoClient.connect(databaseUri, {
                // Tăng timeout connection
                connectTimeoutMS: 30000,
                // Tăng timeout cho các thao tác cụ thể
                socketTimeoutMS: 30000,
                // Tăng timeout cho việc lựa chọn server
                serverSelectionTimeoutMS: 30000,
                // Tăng max pool size
                maxPoolSize: 50,
            });
            
            const db = mongoClient.db(databaseName);
            console.log('MongoDB connected successfully!');
            return { db, mongoClient };
        } catch (err) {
            console.error(`MongoDB connection failed. Retries left: ${retries - 1}`);
            retries -= 1;
            if (retries === 0) {
                console.error('Failed to connect to MongoDB after multiple attempts');
                throw err;
            }
            await new Promise(res => setTimeout(res, 5000)); 
        }
    }
}

async function main() {
    try {
        // Kết nối MongoDB trước
        const { db, mongoClient } = await connectMongoDB();
        if (!db || !mongoClient) {
            throw new Error('Failed to connect to MongoDB');
        }
        
        // Sau đó kết nối Redis
        const redisClient = await connectRedis();
        if (!redisClient) {
            throw new Error('Failed to connect to Redis');
        }
        
        // Khởi tạo server khi đã có cả MongoDB và Redis
        const server = createHttpServer(redisClient, db);
        
        server.listen(env.PORT, () => {
            console.log(`Server running on port ${env.PORT}`);
        });

        const postCollection = 'posts';

        const closeFn = () => {
            console.log('Received OS Signal. Exiting gracefully...');
            redisClient.quit();
            mongoClient.close();
            process.exit(0);
        }

        process.on('SIGINT', closeFn);
        process.on('SIGTERM', closeFn);

        const mongoChangeStreamSource = new MongoDBChangeStreamSource(
            redisClient,
            db,
            postCollection,
        );
        const redisSink = new RedisSink(redisClient);
        const operators = [
            new TransformDataOperator()
        ];

        const pipeline = new Pipeline(
            mongoChangeStreamSource,
            redisSink,
            operators,
        );

        pipeline.run();
    } catch (error) {
        console.error('Initialization error:', error);
        process.exit(1);
    }
}

// Thêm xử lý lỗi không bắt được
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main().catch((err) => {
    console.error('Main function error:', err);
    process.exit(1);
});