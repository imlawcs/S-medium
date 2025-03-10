import { createClient } from 'redis';
import { Source } from '../source';
import { Db } from 'mongodb';
import EventEmitter from 'events';
import post from '../../../../internal/model/post';

class MongoDBChangeStreamSource implements Source {
    redisClient: ReturnType<typeof createClient>;
    watchOperations: string[];

    constructor(
        redisClient: ReturnType<typeof createClient>,
        watchOperations: string[] = ['insert', 'update', 'delete'] 
    ) {
        this.redisClient = redisClient;
        this.watchOperations = watchOperations;
    }

    async get(): Promise<EventEmitter> {
        const eventEmitter = new EventEmitter();
        let resumeToken: string | null = null;

        try {
            resumeToken = await this.redisClient.get('RESUME_TOKEN');
        } catch (err) {
            console.error('[MongoDBChangeStreamSource] Failed to fetch resume token:', err);
        }

        const watchOptions: any = {};
        if (resumeToken) {
            watchOptions.resumeAfter = { _data: resumeToken };
        }

        const pipeline = [
            {
                $match: {
                    operationType: { $in: this.watchOperations }
                }
            }
        ];

        console.info(`[MongoDBChangeStreamSource] Starting change stream on collection: ${post.collection.collectionName}`);
        console.info(`[MongoDBChangeStreamSource] Watching operations: ${this.watchOperations.join(', ')}`);

        let changeStream = post.watch(pipeline, watchOptions);

        changeStream.on('change', async (change) => {
            if (change?.operationType && this.watchOperations.includes(change.operationType)) {
                eventEmitter.emit('change', change);
                
                if (change._id) {
                    try {
                        await this.redisClient.set('RESUME_TOKEN', JSON.stringify(change._id));
                        console.log('[MongoDBChangeStreamSource] Resume token saved:', change._id);
                    } catch (err) {
                        console.error('[MongoDBChangeStreamSource] Failed to save resume token:', err);
                    }
                }
            }
        });

        changeStream.on('error', (error) => {
            console.error('[MongoDBChangeStreamSource] Error in change stream:', error);
            
            if (!changeStream.closed) {
                changeStream.close().catch(err => console.error('[MongoDBChangeStreamSource] Error closing stream:', err));
            }

            setTimeout(() => this.get(), 5000);
        });

        return eventEmitter;
    }
}

export { MongoDBChangeStreamSource };
