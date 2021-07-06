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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderError = exports.renderContent = void 0;
const fs = __importStar(require("fs"));
const path_1 = require("path");
const boom_1 = __importDefault(require("@hapi/boom"));
const TemplateCompiler_1 = require("../TemplateCompiler");
const utils_1 = require("../utils");
const directives_1 = require("../directives");
const { views: viewsPath } = utils_1.Paths.getDashboardPaths();
function makeHelpers(record, template, pages, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const { fields } = template;
        const { content } = record;
        const out = {};
        /* eslint-disable-next-line no-param-reassign */
        record.template = template; // Required for permalink getter
        for (const key of Object.keys(content)) {
            out[key] = yield directives_1.helper(content[key], fields[key], pages);
        }
        out[TemplateCompiler_1.TemplateCompiler.DATA_SYMBOL] = yield record.getMetadata('/', provider);
        return out;
    });
}
/**
 *
 * Renders content into site template
 *
 * @param {string} uriPath
 * @return {string} rendered HTML
 *
 * @todo Use Promise.all when fetching content
 */
function renderContent(uriPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const record = yield utils_1.Paths.getRecordFromPath(uriPath.slice(1), this.provider);
        if (!record) {
            throw boom_1.default.notFound('Record not found');
        }
        const template = record.template;
        const templateName = template.name;
        let pagePath = null;
        if (template.type === 'page') {
            const htmlFile = path_1.join(this.paths.www, `${templateName}.html`);
            const dirFile = path_1.join(this.paths.www, templateName, 'index.html');
            pagePath = (fs.existsSync(htmlFile) && htmlFile) || (fs.existsSync(dirFile) && dirFile) || null;
        }
        else if (template.type === 'collection') {
            const partial = path_1.join(this.paths.www, `_${templateName}.html`);
            const collection = path_1.join(this.paths.www, `collections/${templateName}.html`);
            pagePath = (fs.existsSync(collection) && collection) ||
                (fs.existsSync(partial) && partial) ||
                null;
        }
        if (!pagePath) {
            throw boom_1.default.notFound('Template file not found');
        }
        const componentLookup = (tag) => {
            return fs.readFileSync(path_1.join(process.env.TEMPLATES_PATH, 'components', `${tag}.html`), 'utf8');
        };
        const compiler = new TemplateCompiler_1.TemplateCompiler(componentLookup);
        const { name, type, data, ast } = compiler.parseFile(pagePath);
        // Fetch all renderable pages.
        const pages = yield this.provider.getRecordsByType("page" /* PAGE */);
        // Generate our navigation menu.
        const navigation = [];
        for (const page of pages) {
            const meta = yield page.getMetadata(uriPath, this.provider);
            if (!meta.isNavigation) {
                continue;
            }
            navigation.push(meta);
        }
        // Create our page context data.
        const pageMeta = yield Promise.all(pages.map(p => p.getMetadata(uriPath, this.provider)));
        const pageData = yield makeHelpers(record, template, { pages: pageMeta }, this.provider);
        const context = { this: {} };
        for (const key of Object.keys(pageData)) {
            context.this[key] = pageData[key];
        }
        /* eslint-disable no-await-in-loop */
        for (const model of Object.values(data)) {
            if (model.type === 'page') {
                continue;
            }
            // Fetch all templates where the type and model name match.
            const templates = [yield this.provider.getTemplateByName(model.name, model.type)];
            const _records = yield Promise.all(templates.map((t) => __awaiter(this, void 0, void 0, function* () {
                if (!t) {
                    return;
                }
                const records = yield this.provider.getRecordsByTemplateId(t.id);
                return Promise.all(records.map(r => makeHelpers(r, t, { pages: pageMeta }, this.provider)));
            })));
            const records = _records.filter(Boolean).flat();
            const firstRecord = records[0] || {};
            context[model.name] = (model.type === "collection" /* COLLECTION */) ? records : firstRecord;
        }
        /* eslint-enable no-await-in-loop */
        return compiler.render(name, type, ast, context, {
            navigation,
            page: yield record.getMetadata(uriPath, this.provider),
            site: {
                domain: this.domain,
                name: this.name,
            },
        });
    });
}
exports.renderContent = renderContent;
;
/**
 *
 * Renders error, first by looking in the site directory,
 * then falling back to Vapid own error template.
 *
 * @param {Error} err
 * @param {Object} request
 * @return {[status, rendered]} HTTP status code, and rendered HTML
 */
function renderError(err, request) {
    const error = boom_1.default.boomify(err);
    let status = error.output.statusCode;
    let rendered;
    let errorFile;
    if (process.env.NODE_ENV === 'development' && status !== 404) {
        errorFile = path_1.resolve(viewsPath, 'errors', 'trace.html');
        rendered = new TemplateCompiler_1.TemplateCompiler().renderFile(errorFile, {
            error: {
                status,
                title: error.output.payload.error,
                message: error.message,
                stack: error.stack,
            },
            request,
        });
    }
    else {
        const siteFile = path_1.resolve(this.paths.www, '_error.html');
        status = status === 404 ? 404 : 500;
        errorFile = status === 404 && fs.existsSync(siteFile) ? siteFile : path_1.resolve(viewsPath, 'errors', `${status}.html`);
        rendered = fs.readFileSync(errorFile, 'utf-8');
    }
    if (status !== 404) {
        utils_1.Logger.extra(error.stack);
    }
    return [status, rendered];
}
exports.renderError = renderError;
;
//# sourceMappingURL=index.js.map