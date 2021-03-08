/// <reference types="node" />
import { EventEmitter } from 'events';
import { IProvider } from './providers';
/**
 * Helps keep the database data structure in sync with the site templates
 */
export default class Database extends EventEmitter {
    private previous;
    private provider;
    constructor(provider: IProvider);
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Parses templates and updates the database
     */
    rebuild(): Promise<void>;
    /**
     * Determines if tree has changed since last build
     *
     * @todo Cache so this isn't as taxing on the load time
     */
    isDirty(): boolean;
}
