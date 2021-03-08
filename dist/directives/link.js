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
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
const unfurl_js_1 = require("unfurl.js");
const cache = new Map();
class LinkDirective extends base_1.BaseDirective {
    constructor() {
        super(...arguments);
        this.options = {
            default: null,
            label: '',
            help: '',
            priority: 0,
            unfurl: false,
            format: 'url',
        };
        this.attrs = {
            placeholder: '',
            required: false,
        };
    }
    /* eslint-disable class-methods-use-this */
    /**
     * Renders an HTML url input
     *
     * @param {string} name
     * @param {string} [value=this.options.default]
     * @return rendered input
     */
    input(name, value = null) {
        let namePlaceholder = (value === null || value === void 0 ? void 0 : value.url) || '';
        let selectedPage = null;
        const options = this.meta.pages.reduce((memo, p) => {
            const selected = (value === null || value === void 0 ? void 0 : value.page) === p.id ? 'selected' : '';
            const option = `<option value="${p.id}" ${selected}>${p.name()}</option>`;
            if (selected) {
                selectedPage = p;
                namePlaceholder = p.name();
            }
            return memo + option;
        }, '');
        return `
      <fieldset class="fieldset" id="${name}">
        <label for="${name}[name]">Text</label>
        <small class="help">Human readable link text</small>
        <input type="text" id="${name}[name]" name="${name}[name]" value="${(value === null || value === void 0 ? void 0 : value.name) || ''}" placeholder="${namePlaceholder}">

        <label for="${name}[url]">Link</label>
        <small class="help">The Page or URL to link to</small>
        <select name="${name}[page]" id="${name}[page]" class="${selectedPage ? 'selected' : ''}">
          <option value="">Select a Page</option>
          ${options}
        </select>
        <span>or</span>
        <input type="url" name="${name}[url]" value="${value === null || value === void 0 ? void 0 : value.url}" placeholder="Enter a URL">
      </fieldset>
    `;
    }
    /**
     * The raw value.
     * Typically, directives escape the value.
     *
     * @param {string} [value=this.options.default]
     * @return {string}
     */
    preview(value = this.options.default) {
        return (value === null || value === void 0 ? void 0 : value.url) || '';
    }
    /* eslint-enable class-methods-use-this */
    /**
     * Renders the link, or optionally an oEmbed
     */
    render(value = this.options.default) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = (value === null || value === void 0 ? void 0 : value.page) ? this.meta.pages.find(p => p.id === value.page) : null;
            const unfurled = (this.options.unfurl && (value === null || value === void 0 ? void 0 : value.url)) ? yield unfurl_js_1.unfurl(value === null || value === void 0 ? void 0 : value.url) : null;
            let str = (value === null || value === void 0 ? void 0 : value.url) || (page === null || page === void 0 ? void 0 : page.permalink()) || '';
            if ((value === null || value === void 0 ? void 0 : value.url) && this.options.unfurl) {
                str = yield _oembed(value.url);
            }
            return {
                id: value === null || value === void 0 ? void 0 : value.id,
                url: (value === null || value === void 0 ? void 0 : value.url) || (page === null || page === void 0 ? void 0 : page.permalink()),
                name: (value === null || value === void 0 ? void 0 : value.name) || (page === null || page === void 0 ? void 0 : page.name()) || (value === null || value === void 0 ? void 0 : value.url),
                page: value === null || value === void 0 ? void 0 : value.page,
                description: unfurled === null || unfurled === void 0 ? void 0 : unfurled.description,
                title: unfurled === null || unfurled === void 0 ? void 0 : unfurled.title,
                favicon: unfurled === null || unfurled === void 0 ? void 0 : unfurled.favicon,
                keywords: unfurled === null || unfurled === void 0 ? void 0 : unfurled.keywords,
                oEmbed: unfurled === null || unfurled === void 0 ? void 0 : unfurled.oEmbed,
                twitter_card: unfurled === null || unfurled === void 0 ? void 0 : unfurled.twitter_card,
                open_graph: unfurled === null || unfurled === void 0 ? void 0 : unfurled.open_graph,
                toString() { return str; }
            };
        });
    }
}
exports.default = LinkDirective;
/**
 * @private
 *
 * Attempt to get the oEmbed info for a given link
 * Falls back to an <a> tag if that's not possible.
 *
 * @param {string} value
 * @return {string}
 */
function _oembed(value) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = cache.get(value);
        if (result) {
            return result;
        }
        try {
            const unfurled = yield unfurl_js_1.unfurl(value);
            result = unfurled.twitter_card;
        }
        catch (err) {
            result = `<a href="${value}">${value}</a>`;
        }
        cache.set(value, result);
        return result;
    });
}
//# sourceMappingURL=link.js.map