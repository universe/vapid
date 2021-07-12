import livereload from 'livereload';
import { extname } from 'path';
import pino from 'pino';

const logger = pino();
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
export default class Watcher {

  paths: string[];
  server: ReturnType<typeof livereload.createServer> | null = null;
  callback: (() => void) | null = null;

  /**
   * @param {string|array} [paths=[]] - one or more paths to watch
   * @return {Watcher}
   */
  constructor(paths: string | string[] = []) {
    this.paths = Array.isArray(paths) ? paths : [paths];
  }

  /**
   * Called whenever files are added, changed, or deleted
   */
  handleEvent(filePath: string) {
    // Ignore hidden files
    if (/^\..*/.test(filePath)) return;

    if (extname(filePath).match(reSass)) {
      setTimeout(() => {
        this.callback && this.callback();
        this.refresh(filePath);
      });
      return;
    }

    this.callback && this.callback();
    logger.info(`LiveReload: ${filePath}`);
  }

  /**
   * Starts the file watcher and WebSocket server
   *
   * @param {{server: Server, port: number }} config
   * @param {function} [callback=() => {}] - function to execute when files are changed
   */
  listen(callback = () => {}) {
    this.callback = callback;
    this.server = livereload.createServer();
    this.server.watch(this.paths);
    this.server.on('add', this.handleEvent.bind(this));
    this.server.on('change', this.handleEvent.bind(this));
    this.server.on('unlink', this.handleEvent.bind(this));

    logger.info(`Watching for changes in ${this.paths}`);
  }

  /**
   * Safely shuts down the server
   */
  close() {
    if (this.server) this.server.close();
  }

  /**
   * Broadcasts reload-all command to WebSocket clients
   *
   * @param {string} [filePath=*] - path to refresh
   */
  refresh(filePath = '*') {
    if (!this.server) return;
    const refreshPath = filePath.replace(reSass, '.css');
    this.server.refresh(refreshPath);
    logger.info(`LiveReload: ${filePath}`);
  }

  /**
   * Broadcasts data to all WebSocket clients
   *
   * @param {Object} [data={}]
   */
  broadcast(data = {}) {
    this.server?.sendAllClients(JSON.stringify(data));
  }
}
