"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const colors_1 = __importDefault(require("colors"));
const ARROW = '==>';
/**
 * Decorates console.log statements with colors and symbols
 */
class Logger {
    /**
     * @static
     *
     * General information messages in bold blue, with ==> arrow
     *
     * @param {string} str
     */
    static info(str) {
        console.log(`${colors_1.default.blue(ARROW)} ${str}`.bold);
    }
    /**
     * @static
     *
     * Warnings in bold yellow
     *
     * @param {string} str
     */
    static warn(str) {
        console.log(colors_1.default.bold.yellow(`WARNING: ${str}`));
    }
    /** @static
     *
     * Tagged information
     *
     * @param {string} tag
     * @param {string} str
     */
    static tagged(tag, str, color = 'yellow') {
        const formattedTag = colors_1.default[color](`[${tag}]`);
        console.log(`  ${formattedTag} ${str}`);
    }
    /**
     * @static
     *
     * Errors in bold red
     *
     * @param {string} err
     */
    static error(err) {
        console.log(colors_1.default.bold.red(`ERROR: ${err}`));
    }
    /**
     * @static
     *
     * Additional information with generic formatting, line returns
     *
     * @param {string|array} lines
     */
    static extra(lines) {
        const combined = (Array.isArray(lines) ? lines : [lines]).join('\n');
        console.log(combined);
    }
}
exports.default = Logger;
//# sourceMappingURL=logger.js.map