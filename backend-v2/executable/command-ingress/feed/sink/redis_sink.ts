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

        if (!postId) {
            console.log('[RedisSink] Missing postId, skipping');
            return;
        }

        console.log(`[RedisSink] Processing ${operationType} for post ${postId}`);

        switch (operationType) {
            case 'insert':
                if (!timestamp || !authorId) {
                    console.log('[RedisSink] Missing required metadata for insert operation');
                    return;
                }
                await this.insert(postId, timestamp, authorId, followers, fullDocument);
                break;
            case 'update':
                if (!timestamp) {
                    console.log('[RedisSink] Missing timestamp for update operation');
                    return;
                }
                await this.update(postId, timestamp, followers, fullDocument);
                break;
            case 'delete':
                await this.delete(postId, authorId, followers);
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

            const metadata = await this.redisClient.hGetAll(`post:${postId}:metadata`);
            if (!metadata || !metadata.authorId) {
                console.log(`[RedisSink] Post metadata not found for post ${postId}`);
                return;
            }

            pipeline.set(postKey, JSON.stringify(fullDocument));
            pipeline.expire(postKey, 60 * 60 * 24 * 30); 

            for (const followerId of followers) {
                const feedKey = `user:${followerId}:feed`;
                // Kiểm tra xem post có trong feed không
                const rank = await this.redisClient.zRank(feedKey, postId);
                if (rank !== null) {
                    pipeline.zRem(feedKey, postId);
                    pipeline.zAdd(feedKey, { score: timestamp, value: postId });
                }
            }

            // Cập nhật score trong user:authorId:posts 
            pipeline.zAdd(`user:${metadata.authorId}:posts`, {
                score: timestamp,
                value: postId
            });

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

    async delete(postId: string, authorId: string | undefined, followers: string[]): Promise<void> {
        try {
            const pipeline = this.redisClient.multi();
            const postKey = `post:${postId}`;

            if (!authorId) {
                try {
                    const metadata = await this.redisClient.hGetAll(`post:${postId}:metadata`);
                    authorId = metadata.authorId;
                    console.log(`[RedisSink] Found authorId ${authorId} from metadata for post ${postId}`);
                } catch (err) {
                    console.error(`[RedisSink] Failed to find authorId for post ${postId}:`, err);
                }
            }

            // Xóa dữ liệu post
            pipeline.del(postKey);
            pipeline.del(`post:${postId}:metadata`);

            // Xóa post khỏi feed của tất cả followers
            for (const followerId of followers) {
                pipeline.zRem(`user:${followerId}:feed`, postId);
            }

            // Xóa post từ danh sách posts của author
            if (authorId) {
                pipeline.zRem(`user:${authorId}:posts`, postId);
            }

            await pipeline.exec();
            console.log(`[RedisSink] Successfully deleted post ${postId}`);
        } catch (error) {
            console.error('[RedisSink] Error deleting post:', error);
        }
    }

    async getUserFeed(userId: string, limit = 10, offset = 0): Promise<any[]> {
        try {
            const feedKey = `user:${userId}:feed`;
    
            const postIds = await this.redisClient.zRange(feedKey, -limit - offset, -1 - offset, { REV: true });
                
            if (postIds.length === 0) {
                console.log(`[RedisSink] Không có bài viết trong feed của user ${userId}`);
                return [];
            }
    
            const postKeys = postIds.map((postId) => `post:${postId}`);
            const postData = await this.redisClient.mGet(postKeys);
    
            const posts = postData
                .map((data, index) => (data ? { postId: postIds[index], ...JSON.parse(data) } : null))
                .filter(Boolean);
    
            console.log(`[RedisSink] Trả về ${posts.length} bài viết cho user ${userId}`);
            return posts;
        } catch (error) {
            console.error('[RedisSink] Lỗi khi lấy feed:', error);
            return [];
        }
    }
}

export default RedisSink;