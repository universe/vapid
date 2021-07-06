"use strict";
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
exports.BaseDirective = void 0;
const lodash_escape_1 = __importDefault(require("lodash.escape"));
/**
 * Attempts to cast value to the correct type
 *
 * @param {string} val
 * @return {string|number|boolean}
 */
function coerceType(val) {
    try {
        return JSON.parse(val);
    }
    catch (err) {
        return val;
    }
}
/**
 * The base class that all directives inherit from.
 * These are the crux of Vapid, allowing templates to specify input attributes and render content.
 */
class BaseDirective {
    constructor() {
        this.meta = {
            pages: [],
        };
    }
    init(params = {}, meta = {}) {
        this.meta = Object.assign(Object.assign({}, this.meta), meta);
        // Separate options and attributes, discarding ones that aren't explicity specified
        for (const [key, value] of Object.entries(params)) {
            const coerced = coerceType(value);
            if (Object.hasOwnProperty.call(this.options || {}, key)) {
                this.options[key] = coerced;
            }
            else if (Object.hasOwnProperty.call(this.attrs || {}, key)) {
                this.attrs[key] = coerced;
            }
        }
        return this;
    }
    /**
     * Converts attrs object into HTML key=value attributes
     * Typically used by the input method
     */
    htmlAttrs() {
        const pairs = Object.entries(this.attrs).reduce((memo, [key, value]) => {
            if (value !== undefined && value !== false) {
                memo.push(`${key}="${lodash_escape_1.default(value)}"`);
            }
            return memo;
        }, []);
        return pairs.join(' ');
    }
    preview(value) {
        return lodash_escape_1.default(`${value || this.options.default}`);
    }
    render(value = this.options.default) {
        return __awaiter(this, void 0, void 0, function* () {
            return lodash_escape_1.default(`${value}`);
        });
    }
    serialize(value = this.options.default) {
        return value;
    }
}
exports.BaseDirective = BaseDirective;
//# sourceMappingURL=base.js.map