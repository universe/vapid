"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCompiler = void 0;
// TODO: Clean this up. Lots of hacky stuff in here
const fs_1 = require("fs");
const path_1 = require("path");
const boom_1 = __importDefault(require("@hapi/boom"));
const handlebars_1 = __importDefault(require("handlebars"));
const lodash_merge_1 = __importDefault(require("lodash.merge"));
const Template_1 = require("../Database/models/Template");
const helpers_1 = require("./helpers");
const constants_1 = require("./constants");
function unwrap(func) {
    return function helperWrapper(...args) {
        const values = [];
        for (let arg of args) {
            arg = (typeof arg === 'function') ? arg() : arg;
            arg = (arg instanceof handlebars_1.default.SafeString) ? arg.toString() : arg;
            values.push(arg);
        }
        return func.apply(null, values);
    };
}
/* eslint-enable no-param-reassign */
function parseHash(hash) {
    const out = {};
    for (const pair of hash.pairs || []) {
        out[pair.key] = pair.value.original;
    }
    return out;
}
function missingData(context) {
    return (context.hash && context.hash.default) || `{{${context.path}}}`;
}
/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
class TemplateCompiler {
    /**
     * @param {object} partials – The partials to make available in this project.
     * @param {array} helpers - Additional helpers to make available in this project.
     */
    constructor(partials = {}, helpers = {}) {
        this.rawPartials = {};
        this.helpers = {};
        this.partials = partials;
        // Set up our Handlebars instance.
        // Vapid does not support the default helpers.
        this.Handlebars = handlebars_1.default.create();
        // Register the ones we *do* support!
        this.registerHelper('collection', helpers_1.CollectionHelper);
        this.registerHelper('section', helpers_1.SectionHelper);
        this.registerHelper('if', helpers_1.IfHelper);
        this.registerHelper('unless', helpers_1.UnlessHelper);
        this.registerHelper('collate', helpers_1.CollateHelper);
        this.registerHelper('each', helpers_1.EachHelper);
        this.registerHelper('eq', helpers_1.EqHelper);
        this.registerHelper('math', helpers_1.MathHelper);
        this.registerHelper('link', helpers_1.LinkHelper);
        this.registerHelper('image', helpers_1.ImageHelper);
        this.registerHelper('date', helpers_1.DateHelper);
        // Special helper for logging missing data.
        this.Handlebars.registerHelper('helperMissing', missingData);
        // Register 3rd party helpers
        for (const [name, helper] of Object.entries(helpers)) {
            this.registerHelper(name, helper);
        }
    }
    static get DATA_SYMBOL() { return constants_1.DATA_SYMBOL; }
    // Wrap all helpers so we unwrap function values and SafeStrings
    registerHelper(name, helper) {
        this.Handlebars.registerHelper(name, unwrap(helper.run));
        this.helpers[name] = helper;
    }
    // Get if a given string is a registered helper name.
    isHelper(name) {
        return !!this.helpers[name];
    }
    /**
     * Parses the HTML, and creates a template tree
     *
     * @return {Object} - a representation of the content
     */
    parse(name, type, html, data = {}, _aliases = {}) {
        let ast;
        try {
            ast = handlebars_1.default.parse(html);
        }
        catch (err) {
            throw boom_1.default.boomify(err, { message: 'Bad template syntax' });
        }
        if (type !== "component" /* COMPONENT */) {
            /* eslint-disable-next-line no-param-reassign */
            const template = {
                name,
                type,
                options: {},
                fields: {},
                sortable: false,
            };
            data[Template_1.Template.identifier(template)] = template;
        }
        this.walk(data, ast, {
            '': { name: 'general', type: "settings" /* SETTINGS */, isPrivate: false },
            'this': { name, type, isPrivate: false },
        });
        return {
            name,
            type,
            data,
            ast,
        };
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
        else if (path_1.dirname(filePath).endsWith('components')) {
            type = "component" /* COMPONENT */;
        }
        return this.parse(name, type, html);
    }
    /**
     * Applies content to the template
     *
     * @param {Object} content
     * @return {string} - HTML that has tags replaced with content
     */
    render(name, type, html, context = {}, data = {}) {
        const ast = typeof html === 'string' ? this.parse(name, type, html) : html;
        return this.Handlebars.compile(ast, { knownHelpersOnly: false, explicitPartialContext: false })(context, { data });
    }
    /**
     * Applies content to the template
     *
     * @param {Object} content
     * @return {string} - HTML that has tags replaced with content
     */
    renderFile(filePath, content = {}, data = {}) {
        const { name, type, ast } = this.parseFile(filePath);
        return this.render(name, type, ast, content, data);
    }
    /**
     * @private
     *
     * Recursively walks Mustache tokens, and creates a tree that Vapid understands.
     *
     * @param {Object} tree - a memo that holds the total tree value
     * @param {array} branch - Mustache tokens
     * @return {Object} tree of sections, fields, params, etc.
     */
    /* eslint-disable no-param-reassign */
    walk(data, node, aliases = {}) {
        // Create a new copy of local aliases lookup object each time we enter a new block.
        aliases = Object.create(aliases);
        switch (node.type) {
            case 'Program':
                node.body.forEach((n) => {
                    this.walk(data, n, aliases);
                });
                break;
            // case 'DecoratorBlock': throw new Error('Vapid does not support Decorators.');
            // case 'Decorator': throw new Error('Vapid does not support Decorators.');
            case 'ContentStatement':
                // TODO: Components?
                break;
            case 'PathExpression': {
                const [leaf, path] = this.parseExpression(node);
                leaf && path && addToTree(data, leaf, path, aliases);
                break;
            }
            case 'MustacheStatement':
            case 'SubExpression': {
                // If this mustache has params, it must be a helper.
                // Crawl all its params as potential data values.
                if (node.params && node.params.length) {
                    for (const param of node.params) {
                        this.walk(data, param, aliases);
                    }
                    // Otherwise, this is a plain data value reference. Add it to the current object.
                }
                else {
                    const [leaf, path] = this.parseExpression(node);
                    leaf && path && addToTree(data, leaf, path, aliases);
                }
                break;
            }
            case 'BlockStatement': {
                // All Block statements are helpers. Grab the helper we're evaluating.
                const helper = this.helpers[node.path.original];
                // Crawl all its params as potential data values in scope.
                if (node.params.length && !helper.isBranch) {
                    for (const param of node.params) {
                        this.walk(data, param, aliases);
                    }
                }
                // If this helper denotes the creation of a field, add it to the current model.
                if (helper.isField) {
                    const [leaf, path] = this.parseExpression(node);
                    if (leaf && path) {
                        leaf.hash.type = helper.getType ? (helper.getType(leaf) || leaf.type) : leaf.type;
                        addToTree(data, leaf, path, aliases);
                    }
                }
                // If this helper denotes the creation of a new model type, ensure the model.
                if (helper.isBranch) {
                    this.ensureBranch(data, node, helper);
                }
                // Assign any yielded block params to the aliases object.
                node.program.blockParams = node.program.blockParams || [];
                for (let idx = 0; idx < node.program.blockParams.length; idx += 1) {
                    const param = node.program.blockParams[idx];
                    aliases[param] = helper.blockParam(idx, node) || {
                        name: param,
                        type: "settings" /* SETTINGS */,
                        isPrivate: true,
                    };
                }
                // Section tags change the `this` scope... This is special cased for now.
                if (node.path.original === 'section') {
                    aliases[''] = {
                        name: node.params[0].original,
                        type: parseHash(node.hash).multiple === true ? "collection" /* COLLECTION */ : "settings" /* SETTINGS */,
                        isPrivate: !!node.params[0].data,
                    };
                }
                if (node.program)
                    this.walk(data, node.program, aliases);
                if (node.inverse)
                    this.walk(data, node.inverse, aliases);
                break;
            }
            case 'PartialStatement':
            case 'PartialBlockStatement':
                // TODO: Ban partials?
                if (this.rawPartials[node.name.original]) {
                    this.partials[node.name.original] = this.parse(aliases.this.name, aliases.this.type, this.rawPartials[node.name.original], data, aliases).ast;
                }
                if (node.program)
                    this.walk(data, node.program, aliases);
                break;
            default: {
                /*
                  Do nothing for:
                    - CommentStatement
                    - StringLiteral
                    - NumberLiteral
                    - BooleanLiteral
                    - UndefinedLiteral
                    - NullLiteral
                */
                break;
            }
        }
        return data;
    }
    /* eslint-disable prefer-destructuring */
    parseExpression(node) {
        var _a, _b, _c, _d, _e, _f, _g;
        let path;
        let hash;
        switch (node.type) {
            case 'PathExpression':
                path = node;
                hash = {};
                break;
            case 'BlockStatement':
                path = this.parseExpression(node.params[0])[1];
                hash = parseHash(node.hash);
                break;
            case 'MustacheStatement':
            case 'SubExpression':
                if (node.params.length) {
                    const tmp = this.parseExpression(node.params[0]);
                    path = tmp[1];
                    hash = ((_a = tmp[0]) === null || _a === void 0 ? void 0 : _a.hash) || {};
                }
                else {
                    path = node.path;
                    hash = parseHash(node.hash);
                }
                break;
            default: {
                return [null, null];
            }
        }
        const context = (path === null || path === void 0 ? void 0 : path.original.indexOf('this')) === 0 ? 'this' : '';
        const key = ((_b = path.parts) === null || _b === void 0 ? void 0 : _b.length) === 1 ? path.parts[0] : path.parts.slice(1).join('.');
        // TODO: Handle literal values
        return [{
                type: node.type,
                original: (path === null || path === void 0 ? void 0 : path.original) || '',
                key,
                context: ((_d = (_c = path) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 1 ? context : (_f = (_e = path) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0],
                path: (path === null || path === void 0 ? void 0 : path.original) || '',
                parts: (_g = path) === null || _g === void 0 ? void 0 : _g.parts,
                hash,
                isPrivate: !!(path === null || path === void 0 ? void 0 : path.data),
            }, path];
    }
    ensureBranch(data, node, helper) {
        const [expr] = this.parseExpression(node);
        // If this is not an expression we care about, move on.
        if (!expr) {
            return;
        }
        // If this block is referencing a data property, don't add it to our data model.
        if (node.params.length && (node.params[0].data || expr.isPrivate)) {
            return;
        }
        // Record the type of this section appropriately
        const name = expr.context || expr.key;
        const newBranch = {
            name,
            type: helper.isBranch || "page" /* PAGE */,
            options: expr.hash,
            sortable: !!expr.hash.sortable,
            fields: {},
        };
        const branch = data[Template_1.Template.identifier(newBranch)] = data[Template_1.Template.identifier(newBranch)] || newBranch;
        lodash_merge_1.default(branch.options, newBranch.options);
        lodash_merge_1.default(branch.fields, newBranch.fields);
    }
}
exports.TemplateCompiler = TemplateCompiler;
/**
 * @private
 *
 * Parses a leaf token, and merges into the branch
 *
 * @params {string} leaf;
 * @params {string} path;
 * @params {string} tree;
 * @params {Object} aliases
 * @return {Object}
 */
function addToTree(data, leaf, path, aliases) {
    // If this is a private path, no-op.
    if (!leaf || leaf.isPrivate) {
        return data;
    }
    // If this is a private section, no-op.
    const isPrivateSection = aliases[leaf.context] ? aliases[leaf.context].isPrivate : false;
    if (isPrivateSection) {
        return data;
    }
    // If this is a private key, no-op.
    const isPrivateKey = (!leaf.context && aliases[leaf.key]) ? aliases[leaf.key].isPrivate : false;
    if (isPrivateKey) {
        return data;
    }
    // Log a warning if we're referencing the default general context without an explicit reference.
    // Update the original path node so we can actually render the template.
    if (!leaf.context && !leaf.isPrivate && aliases[''] && aliases[''].name === 'general') {
        console.warn(`[DEPRECATION] Referencing values without a context is deprecated. Found: {{${leaf.original}}}`);
        leaf.context = 'general';
        path.parts.unshift('general');
        path.original = `general.${path.original}`;
    }
    // Get our section reference descriptor.
    const name = (aliases[leaf.context] ? aliases[leaf.context].name : leaf.context) || 'general';
    const type = (aliases[leaf.context] ? aliases[leaf.context].type : "settings" /* SETTINGS */) || "settings" /* SETTINGS */;
    // Ensure the model object reference exists.
    const template = {
        sortable: false,
        name,
        type,
        options: {},
        fields: {},
    };
    const sectionKey = Template_1.Template.identifier(template);
    data[sectionKey] = data[sectionKey] || template;
    // Ensure the field descriptor exists. Merge settings if already exists.
    const old = data[sectionKey].fields[leaf.key] || null;
    data[sectionKey].fields[leaf.key] = {
        key: leaf.key,
        type: leaf.type || (old === null || old === void 0 ? void 0 : old.type) || 'text',
        priority: leaf.hash.priority || (old === null || old === void 0 ? void 0 : old.priority) || 0,
        label: leaf.hash.label || (old === null || old === void 0 ? void 0 : old.label) || '',
        options: Object.assign(Object.assign({}, ((old === null || old === void 0 ? void 0 : old.options) || {})), leaf.hash),
    };
    return data;
}
//# sourceMappingURL=index.js.map