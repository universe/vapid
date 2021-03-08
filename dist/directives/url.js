"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_escape_1 = __importDefault(require("lodash.escape"));
const base_1 = require("./base");
class UrlDirective extends base_1.BaseDirective {
    constructor() {
        super(...arguments);
        this.options = {
            default: '',
            label: '',
            help: '',
            priority: 0,
            prefix: '',
        };
        this.attrs = {
            placeholder: '',
            required: false,
        };
    }
    input(name, value = '') {
        if (value === this.options.default) {
            value = '';
        }
        return `<div class="input__url"><span>${this.options.prefix || ''}</span><input type="url" name="${name}" placeholder="${lodash_escape_1.default(this.options.default)}" value="${lodash_escape_1.default(value)}" ${this.htmlAttrs}></div>`;
    }
}
exports.default = UrlDirective;
//# sourceMappingURL=url.js.map