import { config } from 'dotenv';
import { Pipeline } from '../command-ingress/feed/pipeline';
import { MongoDBChangeStreamSource } from './feed/source/change_stream';
import { RedisSink } from './feed/sink/redis_sink';
import { TransformDataOperator } from './feed/operator/transform_data';
import { createClient } from 'redis';
import {MongoClient} from 'mongodb';
import {mustGetEnv} from '../../lib/env';
import {connectRedis} from '../../lib/redis';


config();


async function connectMongoDB() {
    const databaseUri = mustGetEnv('MONGO_URI');
    const databaseName = mustGetEnv('MONGO_DB_NAME');
    const mongoClient = await MongoClient.connect(databaseUri);
    const db = mongoClient.db(databaseName);

    return {
        db, mongoClient,
    };
}

async function main() {
    const postCollection = 'posts';
    const redisClient: ReturnType<typeof createClient> = await connectRedis();
    const {db, mongoClient} = await connectMongoDB();

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
        new TransformDataOperator()]

    const pipeline = new Pipeline(
        mongoChangeStreamSource,
        redisSink,
        operators,
    );

    pipeline.run();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});