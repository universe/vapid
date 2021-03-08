"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const koa_1 = __importDefault(require("koa"));
const Dashboard_1 = __importDefault(require("./Dashboard"));
const middleware_1 = __importDefault(require("./middleware"));
const Renderer_1 = require("../../Renderer");
const util_1 = require("@universe/util");
const watcher_1 = __importDefault(require("./watcher"));
const Vapid_1 = __importDefault(require("../Vapid"));
const app = new koa_1.default();
const cache = new Map();
/**
 * This is the Vapid development server.
 * The `VapidServer` class extends the base `Vapid` project class
 * to provide a developer server that enables easy site development
 * and content creation through the admin dashboard.
 */
class VapidServer extends Vapid_1.default {
    /**
     * This module works in conjunction with a site directory.
     *
     * @param {string} cwd - path to site
     * @return {Vapid}
     */
    constructor(cwd) {
        super(cwd);
        this.server = null;
        this.watcher = null;
        this.watcher = this.isDev ? new watcher_1.default(this.paths.www) : null;
        this.liveReload = !!(this.watcher && this.config.liveReload);
        this.buildOnStart = !this.isDev;
        // Share with dashboard
        const dashboard = this.dashboard = new Dashboard_1.default({
            local: this.isDev,
            db: this.database,
            provider: this.provider,
            uploadsDir: this.paths.uploads,
            siteName: util_1.toTitleCase(this.name),
            sitePaths: this.paths,
            liveReload: this.liveReload,
        });
        // Set secret key
        app.keys = [process.env.SECRET_KEY];
        // Errors
        app.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield next();
            }
            catch (err) {
                [ctx.status, ctx.body] = Renderer_1.renderError.call(this, err, ctx.request);
                if (this.liveReload) {
                    _injectLiveReload(ctx, this.config.port);
                }
            }
        }));
        // Middleware
        app.use(middleware_1.default.security)
            .use(middleware_1.default.session(app))
            .use(middleware_1.default.webpack(this.isDev, [dashboard.paths.assets, this.paths.www], [this.paths.modules]))
            .use(middleware_1.default.imageProcessing(this.paths))
            .use(middleware_1.default.assets(this.paths.uploads, '/uploads'))
            .use(middleware_1.default.privateFiles)
            .use(middleware_1.default.assets(this.paths.www))
            .use(middleware_1.default.assets(dashboard.paths.assets))
            .use(middleware_1.default.favicon([this.paths.www, dashboard.paths.assets]))
            .use(middleware_1.default.logs)
            .use(dashboard.routes);
        // Main route
        app.use((ctx) => __awaiter(this, void 0, void 0, function* () {
            const cacheKey = ctx.path;
            ctx.body = this.config.cache
                ? cache.get(cacheKey) || cache.set(cacheKey, yield Renderer_1.renderContent.call(this, ctx.path))
                : yield Renderer_1.renderContent.call(this, ctx.path);
            if (this.liveReload) {
                _injectLiveReload(ctx, this.config.port);
            }
        }));
    }
    /**
     * Starts core services (db, watcher, web server)
     * and registers callbacks
     *
     * @listens {server}
     * @listens {watcher}
     * @listens {Record.addHooks}
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            cache.clear();
            this.server = http.createServer(app.callback());
            yield this.database.start();
            // Build if necessary
            if (this.buildOnStart) {
                yield this.database.rebuild();
            }
            // If watcher is present, attach its WebSocket server
            // and register the callback
            if (this.watcher) {
                const watcherOptions = {
                    liveReload: this.liveReload,
                    server: this.server,
                    port: this.config.port,
                };
                this.watcher.listen(watcherOptions, () => {
                    var _a;
                    cache.clear();
                    if (this.database.isDirty()) {
                        (_a = this.watcher) === null || _a === void 0 ? void 0 : _a.broadcast({ command: 'dirty' });
                    }
                });
            }
            else {
                this.server.listen(this.config.port);
            }
            // Clear the cache, and liveReload (optional), when DB changes
            this.database.on('rebuild', () => {
                var _a;
                cache.clear();
                if (this.liveReload) {
                    (_a = this.watcher) === null || _a === void 0 ? void 0 : _a.refresh();
                }
            });
        });
    }
    /**
     * Safely stops the services
     */
    stop() {
        if (this.server) {
            this.server.close();
        }
        this.database.stop();
    }
}
exports.default = VapidServer;
/**
 * @private
 *
 * Injects LiveReload script into HTML
 *
 * @param {Object} ctx
 * @param {number} port - server port number
 */
function _injectLiveReload(ctx, port) {
    const { hostname } = ctx.request;
    const wsPort = _websocketPort(ctx, port);
    const script = `<script src="/dashboard/javascripts/livereload.js?snipver=1&port=${wsPort}&host=${hostname}"></script>`;
    ctx.body = ctx.body.replace(/(<\/body>(?![\s\S]*<\/body>[\s\S]*$))/i, `${script}\n$1`);
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
function _websocketPort(ctx, port) {
    const forwarded = ctx.header['x-forwarded-proto'];
    const protocol = forwarded ? forwarded.split(',')[0] : undefined;
    return protocol === 'https' ? 443 : port;
}
//# sourceMappingURL=index.js.map