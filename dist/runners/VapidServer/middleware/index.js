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
const path = __importStar(require("path"));
const koa_better_flash_1 = __importDefault(require("koa-better-flash"));
const koa_csrf_1 = __importDefault(require("koa-csrf"));
const koa_log_1 = __importDefault(require("koa-log"));
const boom_1 = __importDefault(require("@hapi/boom"));
const koa_helmet_1 = __importDefault(require("koa-helmet"));
const koa_session_1 = __importDefault(require("koa-session"));
const koa_convert_1 = __importDefault(require("koa-convert"));
const webpack_1 = __importDefault(require("./webpack"));
const imageProcessing_1 = __importDefault(require("./imageProcessing"));
const assets_1 = __importDefault(require("./assets"));
const favicon_1 = __importDefault(require("./favicon"));
const PRIVATE_FILE_PREFIXES = new Set(['_', '.']);
exports.default = {
    assets: assets_1.default,
    csrf: new koa_csrf_1.default({
        invalidSessionSecretMessage: 'Invalid session secret',
        invalidSessionSecretStatusCode: 403,
        invalidTokenMessage: 'Invalid CSRF token',
        invalidTokenStatusCode: 403,
        excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
        disableQuery: false,
    }),
    favicon: favicon_1.default,
    flash: koa_better_flash_1.default(),
    imageProcessing: imageProcessing_1.default,
    logs: koa_log_1.default('tiny'),
    // Throw 404 if the path starts with an underscore or period
    privateFiles: function privateFiles(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            if (PRIVATE_FILE_PREFIXES.has(path.basename(ctx.path)[0])) {
                throw boom_1.default.notFound('Filenames starting with an underscore or period are private, and cannot be served.');
            }
            yield next();
        });
    },
    // Custom redirect for turbolinks
    redirect: (ctx, next) => __awaiter(void 0, void 0, void 0, function* () {
        // Override ctx.render
        const { redirect } = ctx;
        ctx.redirect = (url, alt) => {
            ctx.set('Turbolinks-Location', url);
            redirect.apply(ctx, [url, alt]);
        };
        yield next();
    }),
    security: koa_helmet_1.default(),
    session: (app) => koa_convert_1.default(koa_session_1.default(app, { key: 'vapid:sess' })),
    webpack: webpack_1.default,
};
//# sourceMappingURL=index.js.map