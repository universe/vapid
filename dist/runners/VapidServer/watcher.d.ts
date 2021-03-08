import livereload from 'livereload';
/**
 * Watches filesystem for changes,
 * and WebSocket LiveReload
 *
 * @example
 * let watcher = new Watcher('path/to/watch')
 *
 * @example
 * let watcher = new Watcher(['path/to/watch', 'another/path'])
 */
export default class Watcher {
    paths: string[];
    server: ReturnType<typeof livereload.createServer> | null;
    callback: (() => void) | null;
    /**
     * @param {string|array} [paths=[]] - one or more paths to watch
     * @return {Watcher}
     */
    constructor(paths?: string | string[]);
    /**
     * Called whenever files are added, changed, or deleted
     */
    handleEvent(filePath: string): void;
    /**
     * Starts the file watcher and WebSocket server
     *
     * @param {{server: Server, port: number, liveReload: boolean}} config
     * @param {function} [callback=() => {}] - function to execute when files are changed
     */
    listen(config: any, callback?: () => void): void;
    /**
     * Safely shuts down the server
     */
    close(): void;
    /**
     * Broadcasts reload-all command to WebSocket clients
     *
     * @param {string} [filePath=*] - path to refresh
     */
    refresh(filePath?: string): void;
    /**
     * Broadcasts data to all WebSocket clients
     *
     * @param {Object} [data={}]
     */
    broadcast(data?: {}): void;
}
