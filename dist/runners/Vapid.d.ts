import Database from '../Database';
import { IProvider } from '../Database/providers';
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            TEMPLATES_PATH: string;
            PORT: string;
        }
    }
}
interface VapidProjectPaths {
    pjson: string;
    root: string;
    data: string;
    cache: string;
    uploads: string;
    www: string;
    modules: string;
}
export interface VapidSettings {
    cache: boolean;
    database: {
        dialect: 'memory' | 'sqlite' | 'firebase';
        logging: false;
    };
    dataPath: string;
    liveReload: boolean;
    placeholders: boolean;
    port: number;
}
/**
 * Resolves commonly-used project paths
 */
export declare function getProjectPaths(cwd: string, dataPath: string): VapidProjectPaths;
/**
 * This is the main class that powers Vapid projects.
 * It fetches projected environment variables, configuration options,
 * project paths and data storage information. Project runners, like
 * `VapidBuilder` or `VapidServer`, may extend this base class to easily
 * access project configuration and structure data.
 */
export default class Vapid {
    name: string;
    env: 'production' | 'development' | 'test';
    isDev: boolean;
    domain: string;
    prodUrl: string;
    paths: VapidProjectPaths;
    provider: IProvider;
    database: Database;
    config: VapidSettings;
    /**
     * This module works in conjunction with a site directory.
     */
    constructor(cwd: string);
}
export {};
