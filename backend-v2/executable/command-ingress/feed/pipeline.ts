import {Sink} from './sink';
import {Source} from './source';

type Transformer = (data: any) => Promise<any>;

interface Operator {
    run: (data: any) => Promise<any>;
}

class Pipeline {
    source: Source;
    sink: Sink;
    operators: Operator[];
    name: string;

    constructor(source: Source, sink: Sink, operators: Operator[], name: string = 'default') {
        this.source = source;
        this.sink = sink;
        this.operators = operators;
        this.name = name;
    }

    async run() {
        const eventEmitter = await this.source.get();

        eventEmitter.on('change', async (data) => {
            console.log(`[Pipeline:${this.name}] Received data:`, data);
            
            let transformedData = data;
            
            for (const operator of this.operators) {
                transformedData = await operator.run(transformedData);
                
                // Nếu một operator trả về null, dừng pipeline
                if (!transformedData) {
                    console.log(`[Pipeline:${this.name}] Operator returned null, stopping pipeline`);
                    return;
                }
            }

            console.log(`[Pipeline:${this.name}] Transformed data:`, transformedData);
            await this.sink.save(transformedData);
        });
        
        console.log(`[Pipeline:${this.name}] Pipeline started`);
        
        process.on('SIGINT', () => {
            console.log(`[Pipeline:${this.name}] Shutting down pipeline`);
            eventEmitter.removeAllListeners();
        });
    }
}

export {
    Pipeline,
    Transformer,
    Operator,
};