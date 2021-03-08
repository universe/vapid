"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = exports.helper = exports.find = void 0;
const handlebars_1 = __importDefault(require("handlebars"));
const utils_1 = require("../utils");
const text_1 = __importDefault(require("./text"));
const url_1 = __importDefault(require("./url"));
const number_1 = __importDefault(require("./number"));
const link_1 = __importDefault(require("./link"));
const image_1 = __importDefault(require("./image"));
// TODO: Allow custom directives in site folder?
const DIRECTIVES = {
    text: text_1.default,
    url: url_1.default,
    number: number_1.default,
    link: link_1.default,
    image: image_1.default,
};
function find(params = {}, meta = {}) {
    // If no name is given, silently fall back to text.
    const name = params.type === undefined ? 'text' : params.type;
    if (DIRECTIVES[name]) {
        return new DIRECTIVES[name](params, meta);
    }
    // Only show warning if someone explicity enters a bad name
    if (name) {
        utils_1.Logger.warn(`Directive type '${name}' does not exist. Falling back to 'text'`);
    }
    /* eslint-disable-next-line new-cap */
    return new DIRECTIVES.text(params, meta);
}
exports.find = find;
function helper(value, attrs, meta) {
    const directive = find(attrs, meta);
    // @ts-ignore
    const out = directive.render(value);
    return () => (typeof out === 'string' ? new handlebars_1.default.SafeString(out) : out);
}
exports.helper = helper;
function get(name) {
    return DIRECTIVES[name];
}
exports.get = get;
//# sourceMappingURL=index.js.map