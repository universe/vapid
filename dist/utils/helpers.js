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
const fs = __importStar(require("fs"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = require("path");
const mkdirp = __importStar(require("mkdirp"));
/**
 * Helper functions, mostly an extension of Lodash
 */
const Utils = {
    /**
     * Copy a single file
     * and render variables via EJS
     *
     * @param {string} from - the originating path, where to copy from
     * @param {string} to - the destination path, where to copy to
     * @param {Object} data - replacement data for EJS render
     */
    copyFile(from, to, data = {}) {
        // TODO: Should be smarter about how it determines encoding
        let content = fs.readFileSync(from, 'utf-8');
        let toPath = to;
        mkdirp.sync(path_1.dirname(to));
        if (path_1.extname(from) === '.ejs') {
            toPath = to.replace(/\.ejs$/, '');
            content = ejs_1.default.render(content, data, { async: false });
        }
        fs.writeFileSync(toPath, content, 'utf-8');
    },
    /**
     * Recursively copy files from one directory to another,
     * and render variables via EJS
     *
     * @param {string} from - the originating path, where to copy from
     * @param {string} to - the destination path, where to copy to
     * @param {Object} data - replacement data for EJS render
     */
    copyFiles(from, to, data = {}) {
        const filesToCopy = fs.readdirSync(from);
        mkdirp.sync(to);
        filesToCopy.forEach((file) => {
            const toPath = `${to}/${file}`;
            const fromPath = `${from}/${file}`;
            const stats = fs.statSync(fromPath);
            if (stats.isFile()) {
                this.copyFile(fromPath, toPath, data);
            }
            else if (stats.isDirectory()) {
                this.copyFiles(fromPath, toPath, data);
            }
        });
    },
    /**
     * Recursively remove a path
     *
     * @param {string} path
     */
    removeFiles(path) {
        fs.readdirSync(path).forEach((file) => {
            const filePath = path_1.join(path, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                this.removeFiles(filePath);
            }
            else {
                fs.unlinkSync(filePath);
            }
        });
        fs.rmdirSync(path);
    },
};
exports.default = Utils;
//# sourceMappingURL=helpers.js.map