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
const pluralize = __importStar(require("pluralize"));
const util_1 = require("@universe/util");
const utils_1 = require("../../../utils");
const path_1 = require("path");
const assert_1 = __importDefault(require("assert"));
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
// import services from '../../../services';
const VapidBuilder_1 = __importDefault(require("../../VapidBuilder"));
const middleware_1 = __importDefault(require("../middleware"));
const form_1 = __importDefault(require("../../../form"));
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
            ctx.state.record = (yield this.provider.getIndex()) || (yield this.provider.getGeneral());
            ctx.state.template = ctx.state.record.template;
            yield next();
        });
        const findPage = (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const permalink = ctx.params[0].split('/').filter(Boolean).join('/');
            console.log(permalink);
            const record = yield paths_1.getRecordFromPath(permalink, this.provider);
            if (record) {
                ctx.state.template = record.template;
                ctx.state.record = record;
                yield next();
            }
            else {
                throw boom_1.default.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
            }
        });
        const findSection = (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const type = pluralize.singular(ctx.params.type);
            const { name } = ctx.params;
            const template = yield this.provider.getTemplateByName(name, type);
            if (template) {
                // TODO: This seems to be the only way to get the defaultScope/ordering to work
                const records = yield this.provider.getRecordsByTemplateId(template.id);
                template.records = records;
                ctx.state.template = template;
                yield next();
            }
            else {
                throw boom_1.default.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
            }
        });
        const findRecord = (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const record = yield this.provider.getRecordById(ctx.params.id);
            if (record) {
                ctx.state.record = record;
                ctx.state.template = record.template;
                yield next();
            }
            else {
                throw boom_1.default.notFound(`Record ${ctx.params.type}:${ctx.params.name}:${ctx.params.id} not found`);
            }
        });
        const _newRecordAction = (ctx, options = {}, errors) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const body = ctx.request.body;
            let { template, record } = ctx.state;
            record = record || (yield this.provider.updateRecord({
                id: -1,
                content: body.content || {},
                metadata: body.metadata || {},
                templateId: template.id,
                position: 0,
                slug: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }));
            const title = options.title || template.type === 'setting'
                ? template.labelSingular
                : `New ${template.labelSingular} ${template.type === 'page' ? 'Page' : ''}`;
            yield ctx.render('records/edit', title, Object.assign({ isNewRecord: true, collection: (_a = (yield this.provider.getTemplateByName(template.name, "collection" /* COLLECTION */))) === null || _a === void 0 ? void 0 : _a.toJSON(), page: (_b = (yield this.provider.getTemplateByName(template.name, "page" /* PAGE */))) === null || _b === void 0 ? void 0 : _b.toJSON(), template: template === null || template === void 0 ? void 0 : template.toJSON(), record: record === null || record === void 0 ? void 0 : record.toJSON(), action: router.url('records#create', template.typePlural, template.name), errors: Array.isArray(errors) ? _errors(errors) : undefined, Form: form_1.default }, options));
        });
        const _editRecordAction = (ctx, record, errors = []) => __awaiter(this, void 0, void 0, function* () {
            var _c, _d;
            const { template } = ctx.state;
            yield ctx.render('records/edit', template.type === 'page' ? record.name() : record.nameSingular(), {
                isNewRecord: false,
                collection: (_c = (yield this.provider.getTemplateByName(template.name, "collection" /* COLLECTION */))) === null || _c === void 0 ? void 0 : _c.toJSON(),
                page: (_d = (yield this.provider.getTemplateByName(template.name, "page" /* PAGE */))) === null || _d === void 0 ? void 0 : _d.toJSON(),
                template: template === null || template === void 0 ? void 0 : template.toJSON(),
                record: record === null || record === void 0 ? void 0 : record.toJSON(),
                action: router.url('records#update', { type: template.typePlural, name: template.name, id: record.id || '0' }),
                deletePath: router.url('records#delete', { type: template.typePlural, name: template.name, id: record.id || '0' }),
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
            console.log(ctx.state.template);
            ctx.redirect(router.url('sections#index', { type: ctx.state.template.typePlural(), name: ctx.state.template.name }));
        }));
        this.router.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            // For the nav menu
            ctx.state.settings = yield this.provider.getTemplatesByType("settings" /* SETTINGS */);
            // Get all page records.
            const pages = [...yield this.provider.getRecordsByType("page" /* PAGE */)].map(p => p.toJSON());
            const collections = yield this.provider.getTemplatesByType("collection" /* COLLECTION */);
            ctx.state.pages = pages;
            ctx.state.collections = collections.map(c => c.toJSON());
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
            console.log('site url', siteUrl);
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
                var _e, _f;
                try {
                    const referer = ctx.get('Referrer');
                    const matches = referer ? (_f = (_e = url_1.default.parse(referer)) === null || _e === void 0 ? void 0 : _e.path) === null || _f === void 0 ? void 0 : _f.match(/\/dashboard\/(records|templates)\/(\d+)/) : null;
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
        router.get('records#new', '/:type/:name/records/new', findSection, (ctx) => __awaiter(this, void 0, void 0, function* () {
            yield _newRecordAction(ctx, {}, []);
        }));
        router.get('collection#view', '/:type/:name/records/:id', findRecord, (ctx) => __awaiter(this, void 0, void 0, function* () {
            return _editRecordAction(ctx, ctx.state.record);
        }));
        // TODO: Re-add Re-ordering.
        router.post('records#reorder', '/records/reorder', (ctx) => __awaiter(this, void 0, void 0, function* () {
            // const { id, from, to, nav } = ctx.request.body;
            // const record = await this.provider.getRecordById(id);
            // await new services.RecordPositionUpdater(record, from, to, nav).perform(db);
            ctx.status = 200;
        }));
        router.post('records#create', '/:type/:name/records', findSection, (ctx) => __awaiter(this, void 0, void 0, function* () {
            const template = ctx.state.template;
            let record;
            try {
                const { content, metadata } = yield _content(ctx);
                record = yield this.provider.updateRecord({
                    id: -1,
                    position: 0,
                    slug: '',
                    content,
                    metadata,
                    templateId: template.id,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                ctx.state.record = record;
                // If the template is sortable, append the record
                if (template.sortable) {
                    // await new services.RecordPositionUpdater(record).perform();
                }
                ctx.flash('success', `Created ${record.nameSingular}`);
                const name = template.type === 'page' ? record.safeSlug() : template.name;
                return ctx.redirect(router.url('sections#index', { type: template.typePlural(), name }));
            }
            catch (err) {
                console.error(err);
                if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
                    ctx.flash('error', 'Please fix the following errors, then resubmit.');
                    yield _newRecordAction(ctx, {}, err.errors);
                }
                else {
                    throw err;
                }
            }
        }));
        router.post('records#update', '/:type/:name/records/:id', findRecord, (ctx) => __awaiter(this, void 0, void 0, function* () {
            const { record } = ctx.state;
            try {
                const { template } = record;
                const { content, metadata } = yield _content(ctx);
                // If new record is not equal to the old one, update the record in our DB.
                try {
                    assert_1.default.deepStrictEqual(record.content, content);
                    assert_1.default.deepStrictEqual(record.metadata, metadata);
                }
                catch (_err) {
                    yield record.update({ content, metadata });
                    ctx.flash('success', `Updated ${record.nameSingular}`);
                }
                if (template.type !== 'page') {
                    ctx.redirect(router.url('sections#index', { type: template.typePlural(), name: template.name }));
                }
                else {
                    ctx.redirect(router.url('sections#index', { type: template.typePlural(), name: record.safeSlug() }));
                }
            }
            catch (err) {
                if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
                    ctx.flash('error', 'Please fix the following errors, then resubmit.');
                    yield _editRecordAction(ctx, record, err.errors);
                }
                else {
                    throw err;
                }
            }
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
        router.get('records#delete', '/:type/:name/records/:id/delete', findRecord, (ctx) => __awaiter(this, void 0, void 0, function* () {
            const title = ctx.state.template.labelSingular;
            yield ctx.render('records/delete', `Delete ${title}`);
        }));
        router.post('/:type/:name/records/:id/delete', findRecord, (ctx) => __awaiter(this, void 0, void 0, function* () {
            yield ctx.state.record.destroy();
            ctx.flash('success', `Deleted ${ctx.state.record.nameSingular}`);
            if (ctx.state.template.type === 'page') {
                ctx.redirect('/dashboard');
            }
            else {
                ctx.redirect(router.url('sections#index', { type: ctx.state.template.typePlural(), name: ctx.state.template.name }));
            }
        }));
        /*
        * GROUPS
        */
        router.get('sections#pages', '/pages', (ctx) => __awaiter(this, void 0, void 0, function* () {
            // Else, this is a single-record type of template. Render the edit page.
            const templates = [];
            for (const t of yield this.provider.getTemplatesByType("page" /* PAGE */)) {
                templates.push(t);
            }
            return ctx.render('records/templates', 'New Page', { templates });
        }));
        router.get('sections#page', '/pages/(.*)', findPage, (ctx) => __awaiter(this, void 0, void 0, function* () {
            const { record } = ctx.state;
            // Else, this is a single-record type of template. Render the edit page.
            return _editRecordAction(ctx, record);
        }));
        router.get('sections#index', '/:type/:name', findSection, (ctx, errors) => __awaiter(this, void 0, void 0, function* () {
            var _g, _h;
            const { template } = ctx.state;
            // If there are no records created for this template type yet, render the new record page.
            if (template.records.length === 0) {
                return ctx.redirect(router.url('records#new', template.typePlural, template.name));
                // If this is the type of template that contain multiple records, render the records list page.
            }
            else if (template.type === 'collection') {
                const tableAction = ctx.state.template.sortable ? 'draggable' : 'sortable';
                return ctx.render('records/index', ctx.state.template.label, {
                    collection: (_g = (yield this.provider.getTemplateByName(template.name, "collection" /* COLLECTION */))) === null || _g === void 0 ? void 0 : _g.toJSON(),
                    page: (_h = (yield this.provider.getTemplateByName(template.name, "page" /* PAGE */))) === null || _h === void 0 ? void 0 : _h.toJSON(),
                    tableAction,
                    csrf: ctx.csrf || '',
                    Form: form_1.default,
                    errors: Array.isArray(errors) ? _errors(errors) : null,
                });
            }
            // Else, this is a single-record type of template. Render the edit page.
            return _editRecordAction(ctx, template.records[0]);
        }));
        function _content(ctx) {
            return __awaiter(this, void 0, void 0, function* () {
                const metadataFields = ['name', 'slug', 'title', 'description', 'redirectUrl'];
                const body = ctx.request.body;
                const allowedFields = new Set(Object.keys(ctx.state.template.fields));
                const promises = [];
                const content = ctx.state.record ? Object.assign({}, ctx.state.record.content || {}) : {};
                // Only make allowed fields available.
                if (body.content) {
                    for (const field of allowedFields) {
                        content[field] = body.content[field];
                    }
                }
                const metadata = ctx.state.record ? Object.assign({}, ctx.state.record.metadata || {}) : {};
                // Only make allowed fields available.
                if (body.metadata) {
                    for (const field of metadataFields) {
                        metadata[field] = body.metadata[field] || null;
                    }
                }
                // Pre-processing the slug here instead of just in the SQL hook helps with database cache busting.
                if (metadata.slug) {
                    metadata.slug = metadata.slug.replace(/^\/+/, '');
                }
                // Save files
                for (const file of ctx.request.files) {
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
                return { content, metadata };
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