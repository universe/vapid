"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const livereload_1 = __importDefault(require("livereload"));
const path_1 = require("path");
const utils_1 = require("../../utils");
const reSass = /\.s[ac]ss$/;
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
class Watcher {
    /**
     * @param {string|array} [paths=[]] - one or more paths to watch
     * @return {Watcher}
     */
    constructor(paths = []) {
        this.server = null;
        this.callback = null;
        this.paths = Array.isArray(paths) ? paths : [paths];
    }
    /**
     * Called whenever files are added, changed, or deleted
     */
    handleEvent(filePath) {
        // Ignore hidden files
        if (/^\..*/.test(filePath))
            return;
        if (path_1.extname(filePath).match(reSass)) {
            setTimeout(() => {
                this.callback && this.callback();
                this.refresh(filePath);
            });
            return;
        }
        this.callback && this.callback();
        utils_1.Logger.info(`LiveReload: ${filePath}`);
    }
    /**
     * Starts the file watcher and WebSocket server
     *
     * @param {{server: Server, port: number, liveReload: boolean}} config
     * @param {function} [callback=() => {}] - function to execute when files are changed
     */
    listen(config, callback = () => { }) {
        this.callback = callback;
        this.server = livereload_1.default.createServer(config);
        if (!config.liveReload)
            return;
        this.server.watch(this.paths);
        this.server.on('add', this.handleEvent.bind(this));
        this.server.on('change', this.handleEvent.bind(this));
        this.server.on('unlink', this.handleEvent.bind(this));
        utils_1.Logger.info(`Watching for changes in ${this.paths}`);
    }
    /**
     * Safely shuts down the server
     */
    close() {
        if (this.server)
            this.server.close();
    }
    /**
     * Broadcasts reload-all command to WebSocket clients
     *
     * @param {string} [filePath=*] - path to refresh
     */
    refresh(filePath = '*') {
        if (!this.server)
            return;
        const refreshPath = filePath.replace(reSass, '.css');
        this.server.refresh(refreshPath);
        utils_1.Logger.info(`LiveReload: ${filePath}`);
    }
    /**
     * Broadcasts data to all WebSocket clients
     *
     * @param {Object} [data={}]
     */
    broadcast(data = {}) {
        var _a;
        (_a = this.server) === null || _a === void 0 ? void 0 : _a.sendAllClients(JSON.stringify(data));
    }
}
exports.default = Watcher;
//# sourceMappingURL=watcher.js.map