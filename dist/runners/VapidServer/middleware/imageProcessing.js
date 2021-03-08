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
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const fs_1 = require("fs");
const path_1 = require("path");
const ACCEPTED_FORMATS = {
    '.jpg': 1,
    '.jpeg': 1,
    '.png': 1,
    '.webp': 1,
};
/**
 * Resize and crop images
 *
 * @params {Object} paths
 * @return {function}
 */
function imageProcessing(paths) {
    return (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        const ext = path_1.extname(ctx.path).toLowerCase();
        const { w, h } = ctx.query;
        if (!ACCEPTED_FORMATS[ext] ||
            !(w || h))
            return next();
        const filePath = ctx.path.startsWith('/uploads') ?
            path_1.join(paths.data, ctx.path) :
            path_1.join(paths.www, ctx.path);
        const fileStats = fs_1.statSync(filePath);
        const cacheKey = crypto.createHash('md5')
            .update(`${ctx.url}${fileStats.mtime}`)
            .digest('hex');
        const cachePath = path_1.join(paths.cache, `${cacheKey}${ext}`);
        const cacheExists = fs_1.existsSync(cachePath);
        ctx.set('Content-Length', `${fileStats.size}`);
        ctx.type = ext;
        ctx.body = yield (() => __awaiter(this, void 0, void 0, function* () {
            if (cacheExists) {
                return fs_1.readFileSync(cachePath);
            }
            const buffer = fs_1.readFileSync(filePath);
            fs_1.writeFileSync(cachePath, buffer);
            return buffer;
        }))();
        return true;
    });
}
exports.default = imageProcessing;
;
//# sourceMappingURL=imageProcessing.js.map