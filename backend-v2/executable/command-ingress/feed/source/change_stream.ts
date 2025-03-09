import { createClient } from 'redis';
import { Source } from '../source';
import { Db } from 'mongodb';
import EventEmitter from 'events';

class MongoDBChangeStreamSource implements Source {
    redisClient: ReturnType<typeof createClient>;
    mongoDbClient: Db;
    mongoDbCollectionName: string;
    watchOperations: string[];

    constructor(
        redisClient: ReturnType<typeof createClient>,
        mongoDbClient: Db,
        mongoDbCollectionName: string,
        watchOperations: string[] = ['insert', 'update', 'delete'] 
    ) {
        this.redisClient = redisClient;
        this.mongoDbClient = mongoDbClient;
        this.mongoDbCollectionName = mongoDbCollectionName;
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

        console.info(`[MongoDBChangeStreamSource] Starting change stream on collection: ${this.mongoDbCollectionName}`);
        console.info(`[MongoDBChangeStreamSource] Watching operations: ${this.watchOperations.join(', ')}`);

        let changeStream = this.mongoDbClient.collection(this.mongoDbCollectionName).watch(pipeline, watchOptions);

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
