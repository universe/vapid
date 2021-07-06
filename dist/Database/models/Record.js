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
exports.Record = void 0;
const util_1 = require("@universe/util");
const pluralize = __importStar(require("pluralize"));
;
class Record {
    constructor(data, template) {
        this.template = template;
        this.id = data.id;
        this.templateId = data.templateId;
        this.parentId = data.parentId;
        this.content = data.content;
        this.metadata = data.metadata;
        this.position = data.position;
        this.slug = data.slug;
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
    }
    isFirst() {
        return this.id === 0;
    }
    defaultName() {
        let defaultName = this.template.name === 'index' ? 'Home' : this.template.name;
        if (this.template.type === 'collection') {
            defaultName = pluralize.singular(defaultName);
        }
        return this.isFirst() ? defaultName : `${defaultName} ${this.id}`;
    }
    name() {
        if (this.template.type === 'page') {
            return util_1.toTitleCase(this.metadata.name || this.defaultName());
        }
        return util_1.toTitleCase(this.metadata.name || this.slug || this.defaultName());
    }
    defaultSlug() {
        let name = this.content.title || this.content.name || '';
        name = name || (this.template.isCollection()) ? pluralize.singular(this.template.name) : this.template.name;
        name = util_1.toKebabCase(name);
        if (this.isFirst() && this.template.name === 'index') {
            return '';
        }
        if (this.isFirst() && name) {
            return name;
        }
        return `${name}-${this.id}`;
    }
    safeSlug() {
        const customSlug = (this.slug || '').replace(`{${this.template.id}}`, '');
        if (this.isFirst() && this.template.name === 'index') {
            return 'index';
        }
        return customSlug || this.defaultSlug();
    }
    /**
     * URI path to the individual record
     *
     * @return {string}
     */
    permalink() {
        const safeSlug = this.safeSlug();
        let slug = (safeSlug === 'index' || safeSlug === '') ? '' : safeSlug;
        return this.template.type === 'collection' ? `/${this.template.name}/${slug}` : `/${slug}`;
    }
    /**
     * Singularized name
     *
     * @return {string}
     */
    nameSingular() {
        return pluralize.singular(this.name());
    }
    getMetadata(currentUrl, provider) {
        return __awaiter(this, void 0, void 0, function* () {
            const permalink = this.permalink();
            const children = (yield provider.getChildren(this.id)) || null;
            return {
                id: this.id,
                name: this.name(),
                template: this.template.name,
                createdAt: this.createdAt,
                updatedAt: this.updatedAt,
                slug: this.template.hasView() ? this.permalink() : null,
                isNavigation: !!this.metadata.isNavigation,
                hasChildren: !!children.length,
                children: yield Promise.all(children.filter(r => r.id !== this.id).map(r => r.getMetadata(currentUrl, provider))),
                isActive: permalink === '/' ? (permalink === currentUrl || currentUrl === 'index') : currentUrl === permalink,
                isParentActive: permalink === '/' ? (permalink === currentUrl || currentUrl === 'index') : currentUrl.indexOf(permalink) === 0,
                title: this.metadata.title || null,
                description: this.metadata.description || null,
                redirectUrl: this.metadata.redirectUrl || null,
            };
        });
    }
    toJSON() {
        return {
            id: this.id,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            template: this.template.toJSON(),
            templateId: this.templateId,
            content: this.content || {},
            metadata: this.metadata || {},
            position: this.position,
            slug: this.slug,
            isFirst: this.isFirst(),
            defaultName: this.defaultName(),
            name: this.name(),
            defaultSlug: this.defaultSlug(),
            safeSlug: this.safeSlug(),
            permalink: this.permalink(),
            nameSingular: this.nameSingular(),
        };
    }
}
exports.Record = Record;
//# sourceMappingURL=Record.js.map