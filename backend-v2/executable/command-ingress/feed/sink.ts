export interface Sink {
    save(data: any): Promise<void>;
}