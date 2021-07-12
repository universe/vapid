
import * as util from 'util';
import { pipeline } from 'stream';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

import { Json, toTitleCase } from '@universe/util';
import { deploy, Logger, makePublic } from '@cannery/hoist';
import pino from 'pino';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import pov from 'point-of-view';
import findUp from 'find-up';
import handlebars from 'handlebars';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';

import cookie from 'fastify-cookie';
import csrf from 'fastify-csrf';
import helmet from 'fastify-helmet';
import serveStatic from 'fastify-static';
import multipart from 'fastify-multipart';
// import favicon from 'fastify-favicon';

import { Record, stampRecord, isPageType, IField, PageType, Template, IRecord, ITemplate } from '../../Database/models';
import * as directives from '../../directives';
import VapidBuilder from '../VapidBuilder';
import Vapid from '../Vapid';
import Watcher from './watcher';

const DASHBOARD_ASSETS = path.join(findUp.sync('assets', { type: 'directory', cwd: __dirname })!, 'dashboard');
const DASHBOARD_VIEWS = findUp.sync('views', { type: 'directory', cwd: __dirname });
if (!DASHBOARD_ASSETS) { throw new Error('Unable to find dashboard assets directory.') };
if (!DASHBOARD_VIEWS) { throw new Error('Unable to find dashboard views directory.') };

// const viewsPath = findUp.sync('views', { type: 'directory', cwd: __dirname });
const pump = util.promisify(pipeline)
const logger = pino();
const app = fastify({ logger: true });
const cache = new Map();

function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: Error) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}

let pages: Record[] = [];  // TODO: Don't global scope this...
handlebars.registerHelper('eq', (...args) => args[0] === args[1]);
handlebars.registerHelper('and', (...args) => args[0] && args[1]);
handlebars.registerHelper('or', (...args) => args[0] || args[1]);
handlebars.registerHelper('not', (...args) => !args[0]);
handlebars.registerHelper('toTitleCase', (value) => toTitleCase(value));
handlebars.registerHelper('lookup', (obj: any, ...args: any[]) => { for (let arg of args) { obj = obj?.[arg]; } return obj; });
handlebars.registerHelper('directive', (type: 'content' | 'metadata', field: IField, record: IRecord) => {
  const directive = directives.find(field.options, { pages });
  return directive.input(`${type}[${field.key}]`, record?.[type]?.[field.key] as any);
});
handlebars.registerHelper('preview', (record: IRecord | null, fieldName: string, section: ITemplate| null) => {
  const directive = directives.find(section?.fields?.[fieldName]);
  const rendered = directive.preview(record?.content?.[fieldName] as unknown as undefined);
  return (typeof rendered === 'string' && rendered.length > 140) ? `${rendered.slice(0, 140)}...` : rendered;
})

/**
 * This is the Vapid development server.
 * The `VapidServer` class extends the base `Vapid` project class
 * to provide a developer server that enables easy site development
 * and content creation through the admin dashboard.
 */
export default class VapidServer extends Vapid {
  watcher: Watcher;

  /**
   * This module works in conjunction with a site directory.
   *
   * @param {string} cwd - path to site
   * @return {Vapid}
   */
  constructor(cwd: string) {
    super(cwd);
    this.watcher = new Watcher(this.paths.www);
    const db = this.database;

    if (!process.env.SECRET_KEY) { throw new Error('No secret key set for session encryption.'); }

    function toRender(data: FastifyRequest['site']) {
      return {
        siteName: data.siteName,
        settings: data.settings.map(d => d.toJSON()),
        collections: data.collections.map(d => d.toJSON()),
        pages: data.pages.map(d => d.toJSON()),
        showBuild: data.showBuild,
        needsBuild: data.needsBuild,
        record: data.record?.toJSON() || null,
      }
    }

    function contextToRender(data: Context) {
      return {
        type: data.type,
        record: data?.record?.toJSON(),
        template: data?.template?.toJSON(),
        page: data?.page?.toJSON(),
        collection: data?.collection?.map(r => r.toJSON()),
        pageTemplate: data?.pageTemplate?.toJSON(),
        collectionTemplate: data?.collectionTemplate?.toJSON(),
      }
    }

    interface Context {
      type: PageType;
      record: Record | null;
      template: Template | null;
      page: Record | null;
      collection: Record[] | null;
      pageTemplate: Template | null;
      collectionTemplate: Template | null;
    }

    async function ctx(req: FastifyRequest): Promise<Context> {
      const params = req.params as { type: string; page?: string; collection?: string; }
      const type = params.type as PageType || PageType.PAGE;
      if (!isPageType(type)) { throw new Error('Invalid page type in URL.'); }

      let pageSlug = params.page || (type === PageType.SETTINGS ? 'general' : 'index');
      if (pageSlug.endsWith('/')) { pageSlug = pageSlug.slice(0, -1); }
      if (pageSlug === '' || pageSlug === '/') { pageSlug = (type === PageType.SETTINGS ? 'general' : 'index'); }

      let collectionSlug = params.collection;
      if (collectionSlug?.endsWith('/')) { collectionSlug = undefined; }

      const out: Context = {
        type,
        record: null,
        template: null,
        page: null,
        collection: null,
        pageTemplate: null,
        collectionTemplate: null,
      }

      if (type === PageType.SETTINGS) {
        const tmpl = await db.getTemplateByName(pageSlug, PageType.SETTINGS);
        // Settings documents are singletons. Ensure it exists.
        const record = tmpl ? (await db.getRecordsByTemplateId(tmpl.id))[0] || await db.updateRecord(stampRecord({ templateId: tmpl.id })) : null;
        const template = tmpl ? new Template(tmpl) : null;
        out.record = (record && template) ? new Record(record, template) : null;
        out.template = out.pageTemplate = template;
        return out;
      }

      let page = pageSlug ? await db.getRecordFromPath(pageSlug) : null;
      const tmpl = page ? await db.getTemplateById(page.templateId) : await db.getTemplateByName(pageSlug, PageType.PAGE);
      out.pageTemplate = tmpl ? new Template(tmpl) : null;
      page && out.pageTemplate && (out.page = new Record(page, out.pageTemplate));
      const collectionTemplate = await db.getTemplateByName(out.pageTemplate?.name || pageSlug, PageType.COLLECTION);
      out.collectionTemplate = collectionTemplate ? new Template(collectionTemplate) : null;
      const collection = page ? (await db.getChildren(page.id)) : (out.collectionTemplate ? await db.getRecordsByTemplateId(out.collectionTemplate.id) : null);
      out.collection = collection ? collection.map(r => new Record(r, out.collectionTemplate!)) : null;

      if (type === PageType.COLLECTION) {
        const record = (pageSlug && collectionSlug) ? await db.getRecordFromPath(`${pageSlug}/${collectionSlug}`) : null;
        out.record = (record && out.collectionTemplate) ? new Record(record, out.collectionTemplate) : null;
        out.template = out.collectionTemplate;
        return out;
      }

      out.record = out.page;
      out.template = out.pageTemplate;

      return out;
    }

    app.setErrorHandler(function (error, request, reply) {
      return reply.view('errors/trace', {
        error: { status: error.code || 500, title: error.message, message: error.message, stack: error.stack },
        request,
      })
    });

    app.addHook('onSend', async (req, res, payload) => {
      // Custom turbolinks header on redirect.
      if (`${res.statusCode}`.startsWith('3')) { res.header('Turbolinks-Location', res.getHeader('Location')); }
      if (req.url.endsWith('.css')) {
        try {
          const from = req.url.startsWith('/dashboard/static') ? req.url.replace('/dashboard/static', DASHBOARD_ASSETS) : path.join(this.paths.www, req.url);
          const file = await postcss([
            postcssImport({ root: path.dirname(from) }) as any, /* Types are off... this works though. */
            autoprefixer,
          ]).process((typeof payload === 'string' ? payload : await streamToString(payload)), { from, map: { inline: true} });
          return file.css;
        } catch (err) {
          logger.error(err);
          throw err;
        }
      }
      return payload;
    });

    app.register(helmet, { contentSecurityPolicy: false });
    app.register(cookie, { secret: process.env.SECRET_KEY });
    app.register(csrf, { cookieOpts: { signed: true } });
    app.register(pov, { engine: { handlebars }, root: DASHBOARD_VIEWS, layout: 'layout', viewExt: 'hbs' });
    app.register(multipart);
    app.register(serveStatic, { root: path.join(this.paths.www, 'static'), prefix: '/static/' });
    app.register(serveStatic, { root: this.paths.uploads, prefix: '/uploads/', decorateReply: false });
    app.register(serveStatic, { root: DASHBOARD_ASSETS, prefix: '/dashboard/static/', decorateReply: false });

    // Data required for admin dashboard renders.
    app.decorateRequest('site', {
      siteName: toTitleCase(this.name),
      settings: [],
      pages: [],
      collections: [],
      showBuild: false,
      needsBuild: false,
      record: null,
    });

    app.addHook('onRequest', async (req, res): Promise<FastifyReply | undefined> => {
      // Do not serve private files.
      const url = path.parse(req.url);
      if (url.name.startsWith('_') || url.name.startsWith('.')) {
        res.code(404);
        return res.send();
      }

      req.site.settings = (await (await this.database.getTemplatesByType(PageType.SETTINGS))).map(t => new Template(t));
      req.site.collections = (await this.database.getTemplatesByType(PageType.COLLECTION)).map(t => new Template(t));
      pages = req.site.pages = await Promise.all([...await this.database.getRecordsByType(PageType.PAGE)].map(r => Record.hydrate(r, this.database)));
      req.site.showBuild = this.isDev;
      req.site.needsBuild = this.database.isDirty();
      return;
    });

    app.get('/dashboard', async (req, res) => {
      const record = await this.database.getIndex() || await this.database.getGeneral();
      if (!record) { throw new Error('No default record found.') }
      res.view('record', {
        ...toRender(req.site),
        title: record.template.type === PageType.PAGE ? `${record.name()} Page` : `${record.name()} Settings`,
        isNewRecord: false,
        type: record.template.type,
        name: record.template.name,
        template: record.template.toJSON(),
        record: record.toJSON(),
      })
    });

    app.get('/dashboard/deploy', async (_req, res) => {
      const staticBuildPath = path.join(this.paths.root, 'dist');
      const builder = new VapidBuilder(this.paths.root);
      try { await builder.build(staticBuildPath); }
      catch (err) { logger.error(err); throw err; }
      const siteUrl = await deploy(staticBuildPath, undefined, undefined, logger as unknown as Logger, false);
      await makePublic(staticBuildPath);
      res.redirect(siteUrl);
    });

    app.get('/dashboard/build', async (req, res) => {
      await this.database.rebuild();
      // TODO: Render flash.
      // ctx.flash('success', 'Site build complete');
      return res.redirect(req.headers.referer || '/');
    });

    app.get('/dashboard/new', async (req, res) => {
      res.view('templates', {
        ...toRender(req.site),
        templates: (await this.database.getTemplatesByType(PageType.PAGE)).map(t => new Template(t).toJSON()),
      });
    });

    const saveRecord = async (req: FastifyRequest, res: FastifyReply) => {
      const context = await ctx(req);
      let { type, record, template } = context;
      if (!template) { throw new Error(`Template ${type} not found`); }
      record = record || new Record(stampRecord({ templateId: template.id }), template);

      try {
        const metadataFields = ['name', 'slug', 'title', 'description', 'redirectUrl'];
        const allowedFields = new Set(Object.keys(template.fields));

        // Save data
        const content = Object.assign({}, record?.content || {});
        const metadata = Object.assign({}, record?.metadata || {});
        const body: Json = {};

        const ACCEPTED_IMAGE_FORMATS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
        for await (const part of req.parts()) {
          if (part.file) {
            const fieldName = part.fieldname.match(/content\[(.*)\]/)?.[1];
            const { name, ext } = path.parse(part.filename);
            const fileName = `${name}${ext}`;
              // Empty image inputs still submit their value although they have no content. If we don't resume the stream, the handler will never exit.
            if (!fileName || !ACCEPTED_IMAGE_FORMATS.has(ext)) { part.file.resume(); continue; }
            const savePath = path.resolve(this.paths.uploads, fileName);
            if (fieldName && allowedFields.has(fieldName)) {
              await pump(part.file, fs.createWriteStream(savePath));
              const hash = await new Promise((resolve, reject) => {
                const hash = crypto.createHash('md5');
                const stream = fs.createReadStream(savePath);
                stream.on('error', err => reject(err));
                stream.on('data', chunk => hash.update(chunk));
                stream.on('end', () => resolve(hash.digest('hex')));
              });
              const hashName = `${name}-${hash}${ext}`;
              fs.renameSync(savePath, path.join(this.paths.uploads, `${name}-${hash}${ext}`));
              body.content = body.content || {};
              body.content[fieldName] = body.content[fieldName] || hashName;
            }
          }
          else {
            const parts = part.fieldname.replace(/\]/g, '').split('[');
            let obj = body;
            const key = parts.pop()!;
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              obj = obj[part] = (obj[part] || {}) as Json;
            }
            obj[key] = obj[key] || (part as any).value as string;
          }
        }

        // Only explicitly allowed fields are editable.
        for (const field of allowedFields) { content[field] = body.content?.[field] || ''; }
        for (const field of metadataFields) { metadata[field] = body.metadata?.[field] || ''; }

        // Pre-processing the slug here instead of just in the SQL hook helps with database cache busting.
        if (metadata.slug) {
          metadata.slug = `${metadata.slug || ''}`.replace(/^\/+/, '');
        }

        // Process destroys
        for (const fieldName of Object.keys(body._destroy || {})) {
          delete content[fieldName];
        }
        const isDelete = body._delete === 'true';

        if (record && isDelete) {
          await db.deleteRecord(record.id);
          // ctx.flash('success', `Deleted ${record.nameSingular}`);
          (template.type === 'page') ? res.redirect('/dashboard') : res.redirect(`/dashboard/${template.type}${template.name}`);
          return res.redirect('/dashboard');
        }

        if (type === PageType.COLLECTION && record?.template.type !== type) {
          record = new Record(await db.updateRecord({
            ...record,
            content,
            metadata,
            parentId: record?.id || null,
          }), template);

          logger.log('RECORD', record);

          // If the template is sortable, append the record
          if (template.sortable) {
            // await updateRecordPosition(db, record);
          }

          // ctx.flash('success', `Created ${record.nameSingular()}`);
        }
        else {
          record = new Record(await db.updateRecord({ ...record, content, metadata }), template)
          // ctx.flash('success', `Updated ${record.nameSingular()}`);
        }

        const name = template.type !== 'settings' ? record.permalink() : `/${template.name}`;
        return res.redirect(`/dashboard/${template.type}${name}`);
      } catch (err) {
        logger.error(err);
        if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
          // ctx.flash('error', 'Please fix the following errors, then resubmit.');
          const isNewRecord = record ? isNaN(+record?.id) : false;
          const title = isNewRecord ? `New ${name}${type === 'page' ? ' Page' : ''}` : name;
          return res.view('record', {
            ...toRender(req.site),
            ...contextToRender(context),
            title,
            isNewRecord,
            csrf: await res.generateCsrf(),
            // errors: _errors(errors as unknown as Error[]),
          });
        } else {
          throw err;
        }
      }
    }

    const getRecord = async (req: FastifyRequest, res: FastifyReply) => {
      const context = await ctx(req);
      let { type, template } = context;
      if (!template) { throw new Error(`Template for ${req.url} not found`); }
      context.record = context.record || (req.url.startsWith('/dashboard/new') ? new Record(stampRecord({ templateId: template.id }), template) : null);
      const isNewRecord = context.record ? isNaN(+context.record?.id) : false;
      let title: string = '';
      if (type === PageType.SETTINGS) { title = `${context.record?.nameSingular()} Settings`; }
      if (type === PageType.PAGE) { title = `${context.record?.template?.label()} Page`; }
      if (type === PageType.COLLECTION) {
        title = context.record ? `${context.collectionTemplate?.labelSingular() || 'Record'}` : (context.collectionTemplate?.label() || 'Records');
      }
      if (isNewRecord) { title = `New ${title}`; }
      else if (type !== PageType.SETTINGS && context.record) { title = `${title} ${context.record.id}`}

      return res.view('record', {
        ...toRender(req.site),
        ...contextToRender(context),
        title,
        isNewRecord,
        csrf: await res.generateCsrf(),
        // errors: _errors(errors as unknown as Error[]),
      });
    }

    app.post('/dashboard/:type', saveRecord);
    app.post('/dashboard/:type/:page', saveRecord);
    app.post('/dashboard/:type/:page/:collection', saveRecord);

    app.get('/dashboard/:type', getRecord);
    app.get('/dashboard/:type/:page', getRecord);
    app.get('/dashboard/:type/:page/:collection', getRecord);

    app.get('/dashboard/new/:type', getRecord);
    app.get('/dashboard/new/:type/:page', getRecord);
    app.get('/dashboard/new/:type/:page/:collection', getRecord);

    // Main route
    const self = this;
    app.get('/*', async (request, reply) => {
      const requestPath = request.url;
      const body = this.config.cache
        ? cache.get(requestPath) || cache.set(requestPath, await this.compiler.renderContent(self, requestPath))
        : await this.compiler.renderContent(self, requestPath);
      reply.header('Content-Type', 'text/html');
      reply.send(body);
    });
  }

  /**
   * Starts core services (db, watcher, web server)
   * and registers callbacks
   */
  async start() {
    cache.clear();
    await this.database.start();
    await this.database.rebuild();

    // Start livereload.
    this.watcher.listen(() => {
      cache.clear();
      if (this.database.isDirty()) { this.watcher?.broadcast({ command: 'dirty' }); }
    });

    // Clear the cache, and liveReload (optional), when DB changes
    this.database.onRebuild(() => {
      cache.clear();
      this.watcher?.refresh();
    });

    await app.listen(this.config.port);
  }

  /**
   * Safely stops the services
   */
  stop() {
    app.server.close();
    this.database.stop();
  }
}
