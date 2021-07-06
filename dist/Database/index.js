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
const events_1 = require("events");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const glob = __importStar(require("glob"));
const assert = __importStar(require("assert"));
const TemplateCompiler_1 = require("../TemplateCompiler");
const Template_1 = require("./models/Template");
function componentLookup(tag) {
    return fs.readFileSync(path.join(process.env.TEMPLATES_PATH, 'components', `${tag}.html`), 'utf8');
}
const vapidCompiler = new TemplateCompiler_1.TemplateCompiler(componentLookup);
/**
 * Crawls templates, and creates object representing the data model
 *
 * @param {array} templates - array of file paths
 * @return {Object} template tree
 */
function parse() {
    const tree = {};
    const templates = glob.sync(path.resolve(process.env.TEMPLATES_PATH, '**/*.html'));
    for (const tpl of templates) {
        const parsed = vapidCompiler.parseFile(tpl).data;
        console.log(tpl, parsed['collection:endorsements'], parsed['collection:collection']);
        for (const [parsedName, parsedTemplate] of Object.entries(parsed)) {
            // We merge discovered fields across files, so we gradually collect configurations
            // for all sections here. Get or create this shared object as needed.
            const finalTemplate = tree[parsedName] = tree[parsedName] || {
                sortable: false,
                type: null,
                name: null,
                options: {},
                fields: {},
            };
            // Ensure the section name and type are set.
            finalTemplate.name = finalTemplate.name || parsedTemplate.name;
            finalTemplate.type = finalTemplate.type || parsedTemplate.type;
            // Merge section options
            Object.assign(finalTemplate.options, parsedTemplate.options);
            // For every field discovered in the content block, track them in the section.
            for (const [, field] of Object.entries(parsedTemplate.fields)) {
                if (!field) {
                    continue;
                }
                const old = finalTemplate.fields[field.key];
                finalTemplate.fields[field.key] = Object.assign(Object.assign({}, (old || {})), { 
                    // Default to `type: text` if not specified.
                    type: field.type || 'text', priority: field.priority || 0, label: field.label || '', key: field.key, options: Object.assign(Object.assign({}, ((old === null || old === void 0 ? void 0 : old.options) || {})), field.options) });
            }
        }
    }
    return tree;
}
/**
 * Helps keep the database data structure in sync with the site templates
 */
class Database extends events_1.EventEmitter {
    constructor(provider) {
        super();
        this.previous = null;
        this.provider = provider;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.provider.updateTemplate({
                id: 1,
                sortable: false,
                type: "page" /* PAGE */,
                name: 'index',
                options: {},
                fields: {},
            });
            yield this.provider.updateRecord({
                id: 1,
                templateId: 1,
                parentId: null,
                content: {},
                metadata: {},
                position: 0,
                slug: 'index',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            yield this.provider.start();
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () { yield this.provider.stop(); });
    }
    /**
     * Parses templates and updates the database
     */
    rebuild() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.previous) {
                const templates = yield this.provider.getAllTemplates();
                this.previous = templates.reduce((memo, template) => {
                    memo[Template_1.Template.identifier(template)] = template;
                    return memo;
                }, {});
            }
            const tree = parse();
            // For every template file
            let existing = [];
            for (let template of Object.values(tree)) {
                existing.push(this.provider.updateTemplate(template));
            }
            yield Promise.all(existing);
            this.previous = tree;
            this.emit('rebuild');
        });
    }
    /**
     * Determines if tree has changed since last build
     *
     * @todo Cache so this isn't as taxing on the load time
     */
    isDirty() {
        // TODO: Should remove _permalink and other special fields
        try {
            assert.deepStrictEqual(parse(), this.previous);
            return false;
        }
        catch (_err) {
            return true;
        }
    }
}
exports.default = Database;
//# sourceMappingURL=index.js.map