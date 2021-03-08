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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path_1 = require("path");
const FAVICON_PATH = '/favicon.ico';
/**
 * Returns the first matching file found in the supplied paths, if any.
 *
 * @param {string} name
 * @param {array} [paths=[]]
 * @return {string|false}
 */
function findFirst(name, paths = []) {
    for (const p of paths) {
        const filePath = path_1.join(p, name);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return false;
}
/**
 * Serves the first favicon found in the supplied paths
 *
 * @param {array} [paths=[]]
 * @parms {Object} options
 * @return {function|boolean}
 */
function favicon(paths = [], options = { maxAge: 31556926000 }) {
    const maxAge = options.maxAge === null
        ? 86400000
        : Math.min(Math.max(0, options.maxAge), 31556926000);
    const cacheControl = `public, max-age=${maxAge / 1000 | 0}`; // eslint-disable-line no-bitwise
    return (ctx, next) => {
        if (ctx.path !== FAVICON_PATH) {
            return next();
        }
        if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
            ctx.status = ctx.method === 'OPTIONS' ? 200 : 405;
            ctx.set('Allow', 'GET, HEAD, OPTIONS');
        }
        else {
            const filePath = findFirst(FAVICON_PATH, paths);
            ctx.set('Cache-Control', cacheControl);
            ctx.type = 'image/x-icon';
            ctx.body = filePath ? fs.readFileSync(filePath) : '';
        }
        return true;
    };
}
exports.default = favicon;
;
//# sourceMappingURL=favicon.js.map