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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectPaths = void 0;
const path = __importStar(require("path"));
const mkdirp = __importStar(require("mkdirp"));
const dotenv_1 = __importDefault(require("dotenv"));
const Database_1 = __importDefault(require("../Database"));
// import Generator from '../generator';
const providers_1 = require("../Database/providers");
/**
 * Resolves commonly-used project paths
 */
function getProjectPaths(cwd, dataPath) {
    const paths = {
        pjson: path.resolve(cwd, 'package.json'),
        root: path.resolve(cwd, '.'),
        data: path.resolve(cwd, dataPath),
        cache: path.resolve(cwd, path.join(dataPath, 'cache')),
        uploads: path.resolve(cwd, path.join(dataPath, 'uploads')),
        www: path.resolve(cwd, './www'),
        modules: path.resolve(cwd, './node_modules'),
    };
    // Ensure paths exist
    mkdirp.sync(paths.uploads);
    mkdirp.sync(paths.www);
    return paths;
}
exports.getProjectPaths = getProjectPaths;
;
/**
 * This is the main class that powers Vapid projects.
 * It fetches projected environment variables, configuration options,
 * project paths and data storage information. Project runners, like
 * `VapidBuilder` or `VapidServer`, may extend this base class to easily
 * access project configuration and structure data.
 */
class Vapid {
    /**
     * This module works in conjunction with a site directory.
     */
    constructor(cwd) {
        this.config = {
            cache: process.env.NODE_ENV === 'production',
            database: {
                dialect: 'sqlite',
                logging: false,
            },
            dataPath: './data',
            liveReload: process.env.NODE_ENV !== 'production',
            placeholders: process.env.NODE_ENV !== 'production',
            port: parseInt(process.env.PORT, 10) || 3000,
        };
        // User-defined options
        /* eslint-disable-next-line import/no-dynamic-require, global-require */
        const { vapid: options = {}, name, homepage } = require(path.resolve(cwd, 'package.json'));
        dotenv_1.default.config({ path: path.resolve(cwd, '.env') });
        this.name = options.name || name;
        this.env = process.env.NODE_ENV || 'development';
        this.isDev = (this.env === 'development' || this.env === 'test');
        this.config = Object.assign({}, this.config, options);
        this.url = this.isDev ? `localhost:${this.config.port}` : (options.url || homepage);
        this.prodUrl = options.url || homepage;
        this.paths = getProjectPaths(cwd, this.config.dataPath);
        // Initialize database.
        // const dbConfig = this.config.database;
        // if (dbConfig.dialect === 'sqlite') {
        //   dbConfig.storage = path.resolve(this.paths.data, 'vapid.sqlite');
        // }
        this.provider = new providers_1.MemoryProvider({});
        console.log('NEW PROVIDER');
        this.database = new Database_1.default(this.provider);
    }
}
exports.default = Vapid;
//# sourceMappingURL=Vapid.js.map