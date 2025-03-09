import EventEmitter from 'events';

export interface Source {
    get(): Promise<EventEmitter>;
}