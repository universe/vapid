/// <reference types="node" />
import * as http from 'http';
import Dashboard from './Dashboard';
import Watcher from './watcher';
import Vapid from '../Vapid';
/**
 * This is the Vapid development server.
 * The `VapidServer` class extends the base `Vapid` project class
 * to provide a developer server that enables easy site development
 * and content creation through the admin dashboard.
 */
export default class VapidServer extends Vapid {
    server: http.Server | null;
    watcher: Watcher | null;
    dashboard: Dashboard;
    liveReload: boolean;
    buildOnStart: boolean;
    /**
     * This module works in conjunction with a site directory.
     *
     * @param {string} cwd - path to site
     * @return {Vapid}
     */
    constructor(cwd: string);
    /**
     * Starts core services (db, watcher, web server)
     * and registers callbacks
     *
     * @listens {server}
     * @listens {watcher}
     * @listens {Record.addHooks}
     */
    start(): Promise<void>;
    /**
     * Safely stops the services
     */
    stop(): void;
}
