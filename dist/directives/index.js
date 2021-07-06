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
exports.helper = exports.find = void 0;
const helpers_1 = require("../TemplateCompiler/helpers");
const utils_1 = require("../utils");
const choice_1 = __importDefault(require("./choice"));
const color_1 = __importDefault(require("./color"));
const date_1 = __importDefault(require("./date"));
const html_1 = __importDefault(require("./html"));
const image_1 = __importDefault(require("./image"));
const link_1 = __importDefault(require("./link"));
const number_1 = __importDefault(require("./number"));
const text_1 = __importDefault(require("./text"));
const url_1 = __importDefault(require("./url"));
// TODO: Allow custom directives in site folder?
const DIRECTIVES = {
    choice: choice_1.default,
    color: color_1.default,
    date: date_1.default,
    html: html_1.default,
    text: text_1.default,
    url: url_1.default,
    number: number_1.default,
    link: link_1.default,
    image: image_1.default,
};
function find(params = {}, meta = {}) {
    // If no name is given, silently fall back to text.
    let name = params.type === undefined ? 'text' : params.type;
    // Only show warning if someone explicity enters a bad name
    if (!name || !DIRECTIVES[name]) {
        utils_1.Logger.warn(`Directive type '${name}' does not exist. Falling back to 'text'`);
        name = 'text';
    }
    return (new DIRECTIVES[name]()).init(params, meta);
}
exports.find = find;
function helper(value, attrs, meta) {
    return __awaiter(this, void 0, void 0, function* () {
        const directive = find(attrs, meta);
        // @ts-ignore
        const out = yield directive.render(value);
        return () => (typeof out === 'string' && out) ? new helpers_1.SafeString(out) : out;
    });
}
exports.helper = helper;
//# sourceMappingURL=index.js.map