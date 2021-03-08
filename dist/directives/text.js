"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_escape_1 = __importDefault(require("lodash.escape"));
const base_1 = require("./base");
class TextDirective extends base_1.BaseDirective {
    constructor() {
        super(...arguments);
        this.options = {
            default: '',
            label: '',
            help: '',
            priority: 0,
            long: false,
        };
        this.attrs = {
            required: false,
            placeholder: '',
            maxlength: undefined,
        };
    }
    /**
     * Renders either a text or textarea input
     */
    input(name, value = '') {
        if (value === this.options.default) {
            value = '';
        }
        if (this.options.long) {
            return `<textarea name=${name} ${this.htmlAttrs} placeholder="${lodash_escape_1.default(this.options.default)}" resize=false>${value}</textarea>`;
        }
        const type = name.toLowerCase() === 'content[email]' ? 'email' : 'text';
        return `<input type="${type}" name="${name}" placeholder="${lodash_escape_1.default(this.options.default)}" value="${lodash_escape_1.default(value)}" ${this.htmlAttrs}>`;
    }
}
exports.default = TextDirective;
//# sourceMappingURL=text.js.map