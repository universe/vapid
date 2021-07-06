import * as http from 'http';

import Koa from 'koa';

import Dashboard from './Dashboard';
import middleware from './middleware';
import { renderContent, renderError } from '../../Renderer';
import { toTitleCase } from '@universe/util';
import Watcher from './watcher';
import Vapid from '../Vapid';

const app = new Koa();
const cache = new Map();

/**
 * This is the Vapid development server.
 * The `VapidServer` class extends the base `Vapid` project class
 * to provide a developer server that enables easy site development
 * and content creation through the admin dashboard.
 */
export default class VapidServer extends Vapid {
  server: http.Server | null = null;
  watcher: Watcher | null = null;
  dashboard: Dashboard;
  liveReload: boolean;
  buildOnStart: boolean;

  /**
   * This module works in conjunction with a site directory.
   *
   * @param {string} cwd - path to site
   * @return {Vapid}
   */
  constructor(cwd: string) {
    super(cwd);

    this.watcher = this.isDev ? new Watcher(this.paths.www) : null;
    this.liveReload = !!(this.watcher && this.config.liveReload);
    this.buildOnStart = !this.isDev;

    // Share with dashboard
    const dashboard = this.dashboard = new Dashboard({
      local: this.isDev,
      db: this.database,
      provider: this.provider,
      uploadsDir: this.paths.uploads,
      siteName: toTitleCase(this.name),
      sitePaths: this.paths,
      liveReload: this.liveReload,
    });

    // Set secret key
    app.keys = [process.env.SECRET_KEY!];

    // Errors
    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        [ctx.status, ctx.body] = renderError.call(this, err, ctx.request);

        if (this.liveReload) { _injectLiveReload(ctx, this.config.port); }
      }
    });

    // Middleware
    app.use(middleware.security)
      .use(middleware.session(app))
      .use(middleware.webpack(this.isDev, [dashboard.paths.assets, this.paths.www], [this.paths.modules]))
      .use(middleware.imageProcessing(this.paths))
      .use(middleware.assets(this.paths.uploads, '/uploads'))
      .use(middleware.privateFiles)
      .use(middleware.assets(this.paths.www))
      .use(middleware.assets(dashboard.paths.assets))
      .use(middleware.favicon([this.paths.www, dashboard.paths.assets]))
      .use(middleware.logs)
      .use(dashboard.routes);

    // Main route
    app.use(async (ctx) => {
      const cacheKey = ctx.path;

      ctx.body = this.config.cache
        ? cache.get(cacheKey) || cache.set(cacheKey, await renderContent.call(this, ctx.path))
        : await renderContent.call(this, ctx.path);

      if (this.liveReload) { _injectLiveReload(ctx, this.config.port); }
    });
  }

  /**
   * Starts core services (db, watcher, web server)
   * and registers callbacks
   *
   * @listens {server}
   * @listens {watcher}
   * @listens {Record.addHooks}
   */
  async start() {
    cache.clear();
    this.server = http.createServer(app.callback());

    await this.database.start();

    // Build if necessary
    await this.database.rebuild();

    // If watcher is present, attach its WebSocket server
    // and register the callback
    if (this.watcher) {
      const watcherOptions = {
        liveReload: this.liveReload,
        server: this.server,
        port: this.config.port,
      };

      this.watcher.listen(watcherOptions, () => {
        cache.clear();
        if (this.database.isDirty()) {
          this.watcher?.broadcast({ command: 'dirty' });
        }
      });
    } else {
      this.server.listen(this.config.port);
    }

    // Clear the cache, and liveReload (optional), when DB changes
    this.database.on('rebuild',  () => {
      cache.clear();
      if (this.liveReload) { this.watcher?.refresh(); }
    });
  }

  /**
   * Safely stops the services
   */
  stop() {
    if (this.server) { this.server.close(); }
    this.database.stop();
  }
}

/**
 * @private
 *
 * Injects LiveReload script into HTML
 *
 * @param {Object} ctx
 * @param {number} port - server port number
 */
function _injectLiveReload(ctx: Koa.Context, port: number) {
  const { hostname } = ctx.request;
  const wsPort = _websocketPort(ctx, port);
  const script = `<script src="/dashboard/javascripts/livereload.js?snipver=1&port=${wsPort}&host=${hostname}"></script>`;

  ctx.body = (ctx.body as string).replace(/(<\/body>(?![\s\S]*<\/body>[\s\S]*$))/i, `${script}\n$1`);
}

/**
 * @private
 *
 * Hack to help determine Glitch WebSocket port
 *
 * @param {Object} ctx
 * @param {number} port - server port number
 * @return {number} WebSocket port number
 */
function _websocketPort(ctx: Koa.Context, port: number) {
  const forwarded = ctx.header['x-forwarded-proto'];
  const protocol = forwarded ? (forwarded as string).split(',')[0] : undefined;
  return protocol === 'https' ? 443 : port;
}
