"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_config_1 = __importDefault(require("../../../webpack_config"));
const koa_webpack_1 = __importDefault(require("koa-webpack"));
/**
 * Initialize Webpack middleware
 *
 * @params {string} local - is this a local dev environment
 * @params {string} siteDir - path to website being served
 * @return {function}
 */
function webpacker(local, assetDirs = [], moduleDirs = [], output = false) {
    const mode = local ? 'development' : 'production';
    return koa_webpack_1.default({
        dev: {
            logLevel: 'error',
            publicPath: '/',
        },
        hot: false,
        config: webpack_config_1.default(mode, assetDirs, moduleDirs, output),
    });
}
exports.default = webpacker;
;
//# sourceMappingURL=webpack.js.map