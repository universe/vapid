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
const md5_file_1 = __importDefault(require("md5-file"));
const util_1 = require("@universe/util");
const utils_1 = require("../../../utils");
const path_1 = require("path");
const url_1 = __importDefault(require("url"));
const fs_1 = require("fs");
const hoist_1 = require("@cannery/hoist");
const boom_1 = __importDefault(require("@hapi/boom"));
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const koa_busboy_1 = __importDefault(require("koa-busboy"));
const koa_views_1 = __importDefault(require("koa-views"));
const koa_router_1 = __importDefault(require("koa-router"));
const paths_1 = require("../../../utils/paths");
const Record_1 = require("../../../Database/models/Record");
const Template_1 = require("../../../Database/models/Template");
const VapidBuilder_1 = __importDefault(require("../../VapidBuilder"));
const middleware_1 = __importDefault(require("../middleware"));
const directives = __importStar(require("../../../directives"));
const form_1 = __importDefault(require("../../../form"));
function stampRecord(template) {
    return {
        id: NaN,
        templateId: template.id,
        parentId: null,
        position: 0,
        slug: '',
        content: {},
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}
function updateRecordPosition(db, record, from = null, to = null, nav = null) {
    return __awaiter(this, void 0, void 0, function* () {
        record = record;
        from = from ? parseInt(`${from}`, 10) : null;
        to = to ? parseInt(`${to}`, 10) : null;
        nav = !!(nav === 'true' || nav === true);
        const template = yield db.getTemplateById(record.templateId);
        if (!template) {
            return;
        }
        const templateType = template.type;
        const siblings = (templateType === 'page' ? yield db.getRecordsByType("page" /* PAGE */) : yield db.getRecordsByTemplateId(template.id))
            .sort((a, b) => (a.position > b.position ? 1 : -1));
        if (from && isNaN(from) && to && isNaN(to)) {
            const maxPosition = siblings.map(s => s.position).sort().pop() || 0;
            record.position = maxPosition + 1;
            yield db.updateRecord(record);
        }
        else {
            const items = siblings.filter(obj => obj.id !== record.id);
            items.splice(to || 0, 0, record);
            const promises = [];
            items.forEach((item, position) => {
                item.position = position;
                promises.push(db.updateRecord(item));
            });
            yield Promise.all(promises);
            if (typeof nav === 'boolean') {
                const metadata = record.metadata = record.metadata || {};
                metadata.isNavigation = nav;
                yield db.updateRecord(record);
            }
        }
    });
}
/**
 * Dashboard
 * Server routes for authenticating, installing, and managing content
 */
class Dashboard {
    /**
     * @param {Object} sharedVars - variables shared by Vapid class
     *
     * @todo Maybe there's a more standard way of sharing with koa-router classes?
     */
    constructor(opts) {
        this.router = new koa_router_1.default({ prefix: '/dashboard' });
        this.paths = utils_1.Paths.getDashboardPaths();
        this.options = opts;
        this.db = opts.db;
        this.provider = opts.provider;
        const router = this.router;
        const paths = this.paths;
        /*
        * BEFORE ACTIONS
        */
        const defaultSection = (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const record = (yield this.provider.getIndex()) || (yield this.provider.getGeneral());
            ctx.state.template = record && record.template.toJSON();
            ctx.state.record = record === null || record === void 0 ? void 0 : record.toJSON();
            yield next();
        });
        const _editRecordAction = (ctx, type, pageRecord, template, record, errors = []) => __awaiter(this, void 0, void 0, function* () {
            const name = type === 'page' ? record === null || record === void 0 ? void 0 : record.name() : record === null || record === void 0 ? void 0 : record.nameSingular();
            const title = record && isNaN(record === null || record === void 0 ? void 0 : record.id) ? `New ${name}${type === 'page' ? 'Page' : ''}` : name;
            return yield ctx.render('records/edit', title, {
                isNewRecord: !record,
                pageRecord: (pageRecord === null || pageRecord === void 0 ? void 0 : pageRecord.toJSON()) || null,
                template: template.toJSON(),
                record: (record === null || record === void 0 ? void 0 : record.toJSON()) || null,
                errors: _errors(errors),
                Form: form_1.default,
            });
        });
        function _errors(errorObjects = []) {
            const errorItems = Array.isArray(errorObjects) ? errorObjects : [errorObjects];
            const errors = errorItems.reduce((memo, item) => {
                const value = ((str) => {
                    try {
                        return JSON.parse(str);
                    }
                    catch (err) {
                        return str;
                    }
                })(item.message);
                /* eslint-disable-next-line no-param-reassign */
                memo[item.path] = value;
                return memo;
            }, {});
            return errors;
        }
        /*
        * MIDDLEWARES
        */
        router
            .use(middleware_1.default.redirect)
            .use(koa_bodyparser_1.default({}))
            .use(koa_busboy_1.default())
            .use(middleware_1.default.flash)
            .use(middleware_1.default.csrf);
        router.use(koa_views_1.default(paths.views, {
            extension: 'ejs',
            map: {
                html: 'ejs',
            },
        }));
        // TODO: Remove this hack, and create custom views-like middleware
        this.router.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            // Override ctx.render to accept layouts, and add common locals
            const { render } = ctx;
            ctx.render = (relPath, title, locals = {}) => __awaiter(this, void 0, void 0, function* () {
                const layout = relPath.startsWith('auth/') ? 'auth' : 'default';
                Object.assign(locals, {
                    yield: relPath,
                    title,
                    csrf: ctx.csrf,
                    flash: ctx.flash(),
                    requestURL: ctx.request.url,
                    siteName: this.options.siteName,
                    liveReload: this.options.liveReload,
                });
                yield render(`layouts/${layout}`, locals);
            });
            yield next();
        }));
        /*
        * ROOT
        */
        this.router.get('root', '/', defaultSection, (ctx) => __awaiter(this, void 0, void 0, function* () {
            ctx.redirect(router.url('sections#index', { type: ctx.state.template.type, name: ctx.state.template.name }));
        }));
        this.router.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            // For the nav menu
            ctx.state.settings = yield (yield this.provider.getTemplatesByType("settings" /* SETTINGS */)).map(s => s.toJSON());
            ctx.state.pages = [...yield this.provider.getRecordsByType("page" /* PAGE */)].map(p => p.toJSON());
            ctx.state.collections = (yield this.provider.getTemplatesByType("collection" /* COLLECTION */)).map(s => s.toJSON());
            ctx.state.showBuild = this.options.local;
            ctx.state.needsBuild = this.db.isDirty();
            yield next();
        }));
        /*
        * Deploy
        */
        router.get('deploy', '/deploy', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const staticBuildPath = path_1.join(this.options.sitePaths.root, 'dist');
            const builder = new VapidBuilder_1.default(this.options.sitePaths.root);
            try {
                yield builder.build(staticBuildPath);
            }
            catch (err) {
                console.error(err);
                throw err;
            }
            const siteUrl = yield hoist_1.deploy(staticBuildPath, undefined, undefined, console, false);
            yield hoist_1.makePublic(staticBuildPath);
            ctx.redirect(siteUrl);
        }));
        /*
        * BUILD
        */
        router.get('build', '/build', (ctx) => __awaiter(this, void 0, void 0, function* () {
            yield this.db.rebuild();
            // TODO: Not nuts about hard-coding paths here
            const redirectTo = yield (() => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                try {
                    const referer = ctx.get('Referrer');
                    const matches = referer ? (_b = (_a = url_1.default.parse(referer)) === null || _a === void 0 ? void 0 : _a.path) === null || _b === void 0 ? void 0 : _b.match(/\/dashboard\/(records|templates)\/(\d+)/) : null;
                    if (!matches || !matches.length) {
                        return router.url('root', {});
                    }
                    const models = { records: Record_1.Record, templates: Template_1.Template };
                    yield models[matches[1]].findByPk(matches[2], { rejectOnEmpty: true });
                    return 'back';
                }
                catch (err) {
                    return router.url('root', {});
                }
            }))();
            ctx.flash('success', 'Site build complete');
            ctx.redirect(redirectTo, router.url('root', {}));
        }));
        /*
        * RECORDS
        */
        // TODO: Re-add Re-ordering.
        router.post('records#reorder', '/records/reorder', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const { id, from, to, nav } = ctx.request.body;
            const record = yield this.provider.getRecordById(id);
            record && (yield updateRecordPosition(this.provider, record, from, to, nav));
            ctx.status = 200;
        }));
        router.post('image#upload', '/upload', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const files = ctx.request.files || [];
            if (files.length > 1) {
                ctx.status = 400;
                ctx.body = {
                    status: 'error',
                    message: 'One file at a time.',
                };
                return;
            }
            const fileUrl = yield _saveFile(files[0]);
            ctx.status = 200;
            ctx.body = {
                status: 'success',
                data: { url: `/uploads/${fileUrl}` },
            };
        }));
        /*
        * GROUPS
        */
        router.get('sections#pages', '/new', (ctx) => __awaiter(this, void 0, void 0, function* () {
            // Else, this is a single-record type of template. Render the edit page.
            const templates = yield this.provider.getTemplatesByType("page" /* PAGE */);
            ctx.state.record = null;
            return ctx.render('records/templates', 'New Page', { templates });
        }));
        router.get('records#new', '/new/:type/(.*)', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const type = ctx.params.type;
            let slug = ctx.params[0] || 'index';
            if (slug.endsWith('/')) {
                slug = slug.slice(0, -1);
            }
            if (slug === '' || slug === '/') {
                slug = 'index';
            }
            let record = slug ? yield paths_1.getRecordFromPath(slug, this.provider) : null;
            let template = record ? yield this.provider.getTemplateById(record.templateId) : yield this.provider.getTemplateByName(slug, type);
            template = template ? yield this.provider.getTemplateByName(template.name, type) : null;
            if (!template) {
                throw boom_1.default.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
            }
            const tmpl = (yield this.provider.getTemplateById(template.id));
            const tmpRecord = stampRecord(tmpl);
            tmpRecord.parentId = type === "collection" /* COLLECTION */ ? (record === null || record === void 0 ? void 0 : record.id) || null : null;
            record = yield this.provider.updateRecord(tmpRecord);
            return _editRecordAction(ctx, type, record, template, new Record_1.Record(tmpRecord, tmpl), []);
        }));
        router.post('records#update', '/:type/(.*)', (ctx) => __awaiter(this, void 0, void 0, function* () {
            let slug = ctx.params[0] || 'index';
            if (slug.endsWith('/')) {
                slug = slug.slice(0, -1);
            }
            if (slug === '' || slug === '/') {
                slug = 'index';
            }
            const type = ctx.params.type;
            let record = slug ? yield paths_1.getRecordFromPath(slug, this.provider) : null;
            let template = record ? yield this.provider.getTemplateById(record.templateId) : yield this.provider.getTemplateByName(slug, type);
            template = template ? yield this.provider.getTemplateByName(template.name, type) : null;
            if (!template) {
                throw boom_1.default.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
            }
            record = record || new Record_1.Record(stampRecord(template), template);
            try {
                const { content, metadata, isDelete } = yield _content(template, record, (ctx.request.body || {}), ctx.request.files);
                if (record && isDelete) {
                    yield this.provider.deleteRecord(record.id);
                    ctx.flash('success', `Deleted ${record.nameSingular}`);
                    (template.type === 'page') ? ctx.redirect('/dashboard') : ctx.redirect(`/dashboard/${template.type}${template.name}`);
                    return;
                }
                if (type === "collection" /* COLLECTION */ && (record === null || record === void 0 ? void 0 : record.template.type) !== type) {
                    record = yield this.provider.updateRecord(Object.assign(Object.assign({}, record), { content,
                        metadata, parentId: (record === null || record === void 0 ? void 0 : record.id) || null }));
                    console.log('RECORD', record);
                    // If the template is sortable, append the record
                    if (template.sortable) {
                        yield updateRecordPosition(this.provider, record);
                    }
                    ctx.flash('success', `Created ${record.nameSingular()}`);
                }
                else {
                    record = yield this.provider.updateRecord(Object.assign(Object.assign({}, record), { content, metadata }));
                    ctx.flash('success', `Updated ${record.nameSingular()}`);
                }
                console.log('WAT', record, record.permalink());
                const name = template.type !== 'settings' ? record.permalink() : `/${template.name}`;
                return ctx.redirect(`/dashboard/${template.type}${name}`);
            }
            catch (err) {
                console.error('erro', err);
                if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
                    ctx.flash('error', 'Please fix the following errors, then resubmit.');
                    // await _editRecordAction(ctx, record.toJSON(), err.errors);
                }
                else {
                    throw err;
                }
            }
        }));
        router.get('sections#index', '/:type/(.*)', (ctx, errors) => __awaiter(this, void 0, void 0, function* () {
            var _c, _d;
            let slug = ctx.params[0] || 'index';
            if (slug.endsWith('/')) {
                slug = slug.slice(0, -1);
            }
            if (slug === '' || slug === '/') {
                slug = 'index';
            }
            const type = ctx.params.type;
            const record = slug ? yield paths_1.getRecordFromPath(slug, this.provider) : null;
            let template = record ? yield this.provider.getTemplateById(record.templateId) : yield this.provider.getTemplateByName(slug, type);
            template = template ? yield this.provider.getTemplateByName(template.name, type) : null;
            if (!template) {
                throw boom_1.default.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
            }
            ctx.state.template = template.toJSON();
            ctx.state.record = (record === null || record === void 0 ? void 0 : record.toJSON()) || null;
            // If this is the type of template that contain multiple records, render the records list page.
            if (type === 'collection' && (!record || !(record === null || record === void 0 ? void 0 : record.template.isCollection()))) {
                const tableAction = template.sortable ? 'draggable' : 'sortable';
                const records = (yield this.provider.getRecordsByTemplateId(template.id)).map(r => r.toJSON());
                return ctx.render('records/index', template.label(), {
                    page: (_c = (yield this.provider.getTemplateByName(template.name, "page" /* PAGE */))) === null || _c === void 0 ? void 0 : _c.toJSON(),
                    collection: (_d = (yield this.provider.getTemplateByName(template.name, "collection" /* COLLECTION */))) === null || _d === void 0 ? void 0 : _d.toJSON(),
                    pageRecord: ((record === null || record === void 0 ? void 0 : record.toJSON()) || null),
                    record: null,
                    template: template.toJSON(),
                    tableAction,
                    records: records,
                    csrf: ctx.csrf || '',
                    Form: form_1.default,
                    errors: _errors(errors),
                    previewContent: ((record, fieldName, section) => {
                        const directive = directives.find(section.fields[fieldName]);
                        /* @ts-ignore */
                        const rendered = directive.preview(record.content[fieldName]);
                        return rendered && rendered.length > 140 ? `${rendered.slice(0, 140)}...` : rendered;
                    })
                });
            }
            // If there are no records created for this template type yet, render the new record page.
            if (!record) {
                // @ts-ignore
                return ctx.redirect(router.url('records#new', template.type, template.name));
            }
            const pageRecord = type === "page" /* PAGE */ ? record : (record.parentId ? yield this.provider.getRecordById(record.parentId) : null);
            // Else, this is a single-record type of template. Render the edit page.
            return _editRecordAction(ctx, type, pageRecord, template, record);
        }));
        function _content(template, record, body, files) {
            return __awaiter(this, void 0, void 0, function* () {
                const metadataFields = ['name', 'slug', 'title', 'description', 'redirectUrl'];
                const allowedFields = new Set(Object.keys(template.fields));
                const promises = [];
                const content = Object.assign({}, (record === null || record === void 0 ? void 0 : record.content) || {});
                // Only make allowed fields available.
                if (body.content) {
                    for (const field of allowedFields) {
                        content[field] = body.content[field];
                    }
                }
                const metadata = Object.assign({}, (record === null || record === void 0 ? void 0 : record.metadata) || {});
                // Only make allowed fields available.
                if (body.metadata) {
                    for (const field of metadataFields) {
                        metadata[field] = body.metadata[field] || null;
                    }
                }
                // Pre-processing the slug here instead of just in the SQL hook helps with database cache busting.
                if (metadata.slug) {
                    metadata.slug = `${metadata.slug || ''}`.replace(/^\/+/, '');
                }
                // Save files
                for (const file of files) {
                    const fieldName = file.fieldname.match(/content\[(.*)\]/)[1];
                    if (allowedFields.has(fieldName)) {
                        promises.push(_saveFile(file).then((c) => { content[fieldName] = c; }));
                    }
                }
                yield Promise.all(promises);
                // Process destroys
                for (const fieldName of Object.keys(body._destroy || {})) {
                    delete content[fieldName];
                }
                return { content, metadata, isDelete: body._delete === 'true' };
            });
        }
        const _saveFile = (file) => __awaiter(this, void 0, void 0, function* () {
            const fileName = _fileDigest(file);
            const savePath = path_1.resolve(this.options.uploadsDir, fileName);
            const buffer = fs_1.readFileSync(file.path);
            // TODO: Ensure that EXIF rotated images are oriented correctly
            fs_1.writeFileSync(savePath, buffer, { encoding: 'binary' });
            return fileName;
        });
        function _fileDigest(file) {
            const hash = md5_file_1.default(file.path.toString(), () => { });
            const { name, ext } = path_1.parse(file.filename);
            return `${util_1.toSnakeCase(name)}-${hash}${ext}`;
        }
    }
    /**
     * Returns routes
     */
    get routes() {
        return this.router.routes();
    }
}
exports.default = Dashboard;
//# sourceMappingURL=index.js.map