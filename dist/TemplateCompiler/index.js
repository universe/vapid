"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCompiler = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
const renderer_1 = require("./renderer");
const parser_1 = require("./parser");
/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
class TemplateCompiler {
    /**
     * @param {object} partials – The partials to make available in this project.
     * @param {array} helpers - Additional helpers to make available in this project.
     */
    constructor(resolveComponent = () => '', helpers = {}) {
        this.helpers = {};
        this.resolveComponent = resolveComponent;
        // Register native helpers
        this.registerHelper('collection', helpers_1.CollectionHelper);
        this.registerHelper('if', helpers_1.IfHelper);
        this.registerHelper('unless', helpers_1.UnlessHelper);
        this.registerHelper('collate', helpers_1.CollateHelper);
        this.registerHelper('each', helpers_1.EachHelper);
        this.registerHelper('eq', helpers_1.EqHelper);
        this.registerHelper('math', helpers_1.MathHelper);
        this.registerHelper('link', helpers_1.LinkHelper);
        this.registerHelper('image', helpers_1.ImageHelper);
        this.registerHelper('date', helpers_1.DateHelper);
        // Register 3rd party helpers
        for (const [name, helper] of Object.entries(helpers)) {
            this.registerHelper(name, helper);
        }
    }
    static get DATA_SYMBOL() { return types_1.DATA_SYMBOL; }
    // Wrap all helpers so we unwrap function values and SafeStrings
    registerHelper(name, helper) {
        this.helpers[name] = helper;
    }
    /**
     * Applies content to the template
     *
     * @param {Object} content
     * @return {string} - HTML that has tags replaced with content
     */
    parseFile(filePath) {
        const html = fs_1.readFileSync(filePath, 'utf8');
        const name = path_1.basename(filePath, '.html');
        let type = "page" /* PAGE */;
        if (path_1.dirname(filePath).endsWith('collections')) {
            type = "collection" /* COLLECTION */;
        }
        else if (path_1.dirname(filePath).endsWith('components') || name.startsWith('_')) {
            type = "component" /* COMPONENT */;
        }
        return parser_1.parse(name, type, html, this.resolveComponent, this.helpers);
    }
    /**
     * Applies content to the template
     *
     * @param {Object} content
     * @return {string} - HTML that has tags replaced with content
     */
    renderFile(filePath, content = {}, data = {}) {
        const { name, type, ast } = this.parseFile(filePath);
        return renderer_1.render(name, type, ast, this.resolveComponent, this.helpers, content, data);
    }
    render(name, type, ast, content = {}, data = {}) {
        return renderer_1.render(name, type, ast, this.resolveComponent, this.helpers, content, data);
    }
}
exports.TemplateCompiler = TemplateCompiler;
//# sourceMappingURL=index.js.map