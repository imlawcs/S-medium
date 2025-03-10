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
import mongoose from 'mongoose';

config();

async function connectMongoDB() {
    const databaseUri = mustGetEnv('MONGO_URI');

    if (mongoose.connection.readyState !== 0) {
        console.log("MongoDB đã kết nối, không cần kết nối lại!");
        return mongoose.connection;
    }

    try {
        await mongoose.connect(databaseUri, {
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 30000,
            maxPoolSize: 50,
        });

        console.log("MongoDB connected successfully!");
        return mongoose.connection;
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

async function main() {
    try {
        // Kết nối MongoDB trước
        const { db } = await connectMongoDB();
        if (!db ) {
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

        const postCollection = ['posts'];

        const closeFn = () => {
            console.log('Received OS Signal. Exiting gracefully...');
            redisClient.quit();
            process.exit(0);
        }

        process.on('SIGINT', closeFn);
        process.on('SIGTERM', closeFn);

        const mongoChangeStreamSource = new MongoDBChangeStreamSource(
            redisClient,
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