import { createClient } from 'redis';
import { Sink } from '../sink';
import _ from 'lodash';

export class RedisSink implements Sink {
    redisClient: ReturnType<typeof createClient>;

    constructor(redisClient: ReturnType<typeof createClient>) {
        this.redisClient = redisClient;
    }

    async save(data: any): Promise<void> {
        if (!data || !data.sinkData) {
            console.log('[RedisSink] No sink data available, skipping');
            return;
        }

        const sinkData = data.sinkData;
        const followers = _.get(sinkData, 'followers', []);
        const postMetadata = _.get(sinkData, 'postMetadata', {});
        const fullDocument = _.get(sinkData, 'fullDocument', {});

        const { postId, timestamp, authorId, operationType } = postMetadata;

        if (!postId || !timestamp) {
            console.log('[RedisSink] Missing required metadata, skipping');
            return;
        }

        console.log(`[RedisSink] Processing ${operationType} for post ${postId}`);

        switch (operationType) {
            case 'insert':
                await this.insert(postId, timestamp, authorId, followers, fullDocument);
                break;
            case 'update':
                await this.update(postId, timestamp, followers, fullDocument);
                break;
            case 'delete':
                await this.delete(postId, followers);
                break;
            default:
                console.log(`[RedisSink] Unknown operation type: ${operationType}`);
        }
    }

    async insert(postId: string, timestamp: number, authorId: string, followers: string[], fullDocument: any): Promise<void> {
        try {
            const pipeline = this.redisClient.multi();
            const postKey = `post:${postId}`;

            pipeline.set(postKey, JSON.stringify(fullDocument));
            pipeline.expire(postKey, 60 * 60 * 24 * 30); 

            for (const followerId of followers) {
                pipeline.zAdd(`user:${followerId}:feed`, {
                    score: timestamp,
                    value: postId
                });
                pipeline.zRemRangeByRank(`user:${followerId}:feed`, 0, -501); 
            }

            pipeline.zAdd(`user:${authorId}:posts`, {
                score: timestamp,
                value: postId
            });

            pipeline.hSet(`post:${postId}:metadata`, {
                lastOperation: 'insert',
                lastUpdated: timestamp.toString(),
                authorId
            });

            await pipeline.exec();
            console.log(`[RedisSink] Successfully inserted post ${postId}`);
        } catch (error) {
            console.error('[RedisSink] Error inserting post:', error);
        }
    }

    async update(postId: string, timestamp: number, followers: string[], fullDocument: any): Promise<void> {
        try {
            const pipeline = this.redisClient.multi();
            const postKey = `post:${postId}`;

            pipeline.set(postKey, JSON.stringify(fullDocument));
            pipeline.expire(postKey, 60 * 60 * 24 * 30); 

            for (const followerId of followers) {
                const feedKey = `user:${followerId}:feed`;
                const feedItems = await this.redisClient.zRange(feedKey, 0, -1);

                for (const item of feedItems) {
                    if (item === postId) {
                        pipeline.zRem(feedKey, item);
                        pipeline.zAdd(feedKey, { score: timestamp, value: postId });
                        break;
                    }
                }
            }

            pipeline.hSet(`post:${postId}:metadata`, {
                lastOperation: 'update',
                lastUpdated: timestamp.toString()
            });

            await pipeline.exec();
            console.log(`[RedisSink] Successfully updated post ${postId}`);
        } catch (error) {
            console.error('[RedisSink] Error updating post:', error);
        }
    }

    async delete(postId: string, followers: string[]): Promise<void> {
        try {
            const pipeline = this.redisClient.multi();
            const postKey = `post:${postId}`;

            pipeline.del(postKey);
            pipeline.del(`post:${postId}:metadata`);

            for (const followerId of followers) {
                pipeline.zRem(`user:${followerId}:feed`, postId);
            }

            for (const followerId of followers) {
                pipeline.zRem(`user:${followerId}:posts`, postId);
            }

            await pipeline.exec();
            console.log(`[RedisSink] Successfully deleted post ${postId}`);
        } catch (error) {
            console.error('[RedisSink] Error deleting post:', error);
        }
    }
}

export default RedisSink;
