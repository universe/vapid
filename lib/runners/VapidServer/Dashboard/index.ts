import checksum from 'md5-file';
import { toSnakeCase, Json } from '@universe/util';

import { Paths } from '../../../utils';

import { join, parse, resolve } from 'path';
import url from 'url';
import { readFileSync, writeFileSync, ReadStream } from 'fs';

import { deploy, makePublic } from '@cannery/hoist';
import Boom from '@hapi/boom';
import Koa from 'koa';

import bodyParser from 'koa-bodyparser';
import multipartParser from 'koa-busboy';
import views from 'koa-views';
import Router from 'koa-router';
import { getRecordFromPath } from '../../../utils/paths';
import { IRecord, Record } from '../../../Database/models/Record';
import { ITemplate, PageType, Template } from '../../../Database/models/Template';

import VapidBuilder from '../../VapidBuilder';
import middleware from '../middleware';
import Database from '../../../Database';
import { IProvider } from '../../../Database/providers';
import * as directives from '../../../directives';

import Form from '../../../form';

function stampRecord(template: Template): IRecord {
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
  }
}

async function updateRecordPosition(db: IProvider, record: Record, from: number | null = null, to: number | null = null, nav: string | boolean | null = null) {
  record = record;
  from = from ? parseInt(`${from}`, 10) : null;
  to = to ? parseInt(`${to}`, 10) : null;
  nav = !!(nav === 'true' || nav === true);
  const template = await db.getTemplateById(record.templateId);
  if (!template) { return; }
  const templateType = template.type;
  const siblings = (templateType === 'page' ? await db.getRecordsByType(PageType.PAGE) : await db.getRecordsByTemplateId(template.id))
  .sort((a, b) => (a.position > b.position ? 1 : -1));

  if (from && isNaN(from) && to && isNaN(to)) {
    const maxPosition = siblings.map(s => s.position).sort().pop() || 0;
    record.position = maxPosition + 1;
    await db.updateRecord(record);
  } else {
    const items = siblings.filter(obj => obj.id !== record.id);
    items.splice(to || 0, 0, record);
    const promises: Promise<Record>[] = [];
    items.forEach((item, position) => {
      item.position = position;
      promises.push(db.updateRecord(item));
    });

    await Promise.all(promises);
    if (typeof nav === 'boolean') {
      const metadata = record.metadata = record.metadata || {};
      metadata.isNavigation = nav;
      await db.updateRecord(record)
    }
  }
}

type JSONRecord = ReturnType<Record["toJSON"]>;
type JSONTemplate = ReturnType<Template["toJSON"]>;

interface AppState {
  pages: JSONRecord[];
  settings: JSONTemplate[];
  collections: JSONTemplate[];
  showBuild: boolean;
  needsBuild: boolean;
  template: JSONTemplate;
  record: JSONRecord | null;
}

interface IKoaContext {
  csrf: string | undefined,
  flash: (type: 'success' | 'error' | 'warning', message: string) => void;
  render: (relPath: string, title: string, locals?: Json) => Promise<void>;
  pages: JSONRecord[];
}

// TODO: Don't use module globals.
interface DashboardOptions {
  local: boolean;
  uploadsDir: string;
  siteName: string;
  sitePaths: { root: string; };
  liveReload: boolean;
  provider: IProvider;
  db: Database;
}

/**
 * Dashboard
 * Server routes for authenticating, installing, and managing content
 */
export default class Dashboard {

  private db: Database;
  private provider: IProvider;
  private router = new Router<AppState, IKoaContext>({ prefix: '/dashboard' });
  private options: DashboardOptions;
  public paths = Paths.getDashboardPaths();

  /**
   * @param {Object} sharedVars - variables shared by Vapid class
   *
   * @todo Maybe there's a more standard way of sharing with koa-router classes?
   */
  constructor(opts: DashboardOptions) {
    this.options = opts;
    this.db = opts.db;
    this.provider = opts.provider;
    const router = this.router;
    const paths = this.paths;

    /*
    * BEFORE ACTIONS
    */
   const defaultSection = async (ctx: Koa.Context, next: () => void) => {
    const record = await this.provider.getIndex() || await this.provider.getGeneral();
    ctx.state.template = record && record.template.toJSON();
    ctx.state.record = record?.toJSON();
    await next();
  }

  const _editRecordAction = async (
    ctx: Koa.Context,
    type: PageType,
    pageRecord: Record | null,
    template: Template,
    record: Record | null,
    errors = [],
  ) => {
    const name = type === 'page' ? record?.name() : record?.nameSingular();
    const title = record && isNaN(record?.id) ? `New ${name}${type === 'page' ? 'Page' : ''}` : name;
    return await ctx.render('records/edit', title, {
      isNewRecord: !record,
      pageRecord: pageRecord?.toJSON() || null,
      template: template.toJSON(),
      record: record?.toJSON() || null,
      errors: _errors(errors),
      Form,
    });
  }

  function _errors(errorObjects: Error[] | Error = []): Json {
    const errorItems = Array.isArray(errorObjects) ? errorObjects : [errorObjects];
    const errors = errorItems.reduce((memo, item) => {
      const value = ((str) => {
        try {
          return JSON.parse(str);
        } catch (err) {
          return str;
        }
      })(item.message);

      /* eslint-disable-next-line no-param-reassign */
      memo[(item as any).path] = value;
      return memo;
    }, {});

    return errors;
  }

    /*
    * MIDDLEWARES
    */
    router
      .use(middleware.redirect)
      .use(bodyParser({}))
      .use(multipartParser())
      .use(middleware.flash)
      .use(middleware.csrf)

    router.use(views(paths.views, {
      extension: 'ejs',
      map: {
        html: 'ejs',
      },
    }));

    // TODO: Remove this hack, and create custom views-like middleware
    this.router.use(async (ctx, next) => {
      // Override ctx.render to accept layouts, and add common locals
      const { render } = ctx;

      ctx.render = async (relPath, title, locals = {}) => {
        const layout = relPath.startsWith('auth/') ? 'auth' : 'default';

        Object.assign(locals, {
          yield: relPath,
          title,
          csrf: ctx.csrf,
          flash: (ctx.flash as unknown as () => void)(),
          requestURL: ctx.request.url,
          siteName: this.options.siteName,
          liveReload: this.options.liveReload,
        });

        await (render as unknown as (path: string, ctx: Json) => Promise<void>)(`layouts/${layout}`, locals);
      };

      await next();
    });

    /*
    * ROOT
    */

    this.router.get('root', '/', defaultSection, async (ctx) => {
      ctx.redirect(router.url('sections#index', { type: ctx.state.template.type, name: ctx.state.template.name }));
    });

    this.router.use(async (ctx, next) => {
      // For the nav menu
      ctx.state.settings = await (await this.provider.getTemplatesByType(PageType.SETTINGS)).map(s => s.toJSON());
      ctx.state.pages = [...await this.provider.getRecordsByType(PageType.PAGE)].map(p => p.toJSON());
      ctx.state.collections = (await this.provider.getTemplatesByType(PageType.COLLECTION)).map(s => s.toJSON());

      ctx.state.showBuild = this.options.local;
      ctx.state.needsBuild = this.db.isDirty();
      await next();
    });

    /*
    * Deploy
    */
    router.get('deploy', '/deploy', async (ctx) => {
      const staticBuildPath = join(this.options.sitePaths.root, 'dist');
      const builder = new VapidBuilder(this.options.sitePaths.root);
      try {
        await builder.build(staticBuildPath);
      } catch (err) {
        console.error(err);
        throw err;
      }
      const siteUrl = await deploy(staticBuildPath, undefined, undefined, console, false);
      await makePublic(staticBuildPath);
      ctx.redirect(siteUrl);
    });

    /*
    * BUILD
    */
    router.get('build', '/build', async (ctx) => {
    await this.db.rebuild();

    // TODO: Not nuts about hard-coding paths here
    const redirectTo = await (async () => {
      try {
        const referer = ctx.get('Referrer');
        const matches = referer ? url.parse(referer)?.path?.match(/\/dashboard\/(records|templates)\/(\d+)/) : null;
        if (!matches || !matches.length) {
          return router.url('root', {});
        }
        const models = { records: Record, templates: Template };
        await models[matches[1]].findByPk(matches[2], { rejectOnEmpty: true });
        return 'back';
      } catch (err) {
        return router.url('root', {});
      }
    })();

    ctx.flash('success', 'Site build complete');
    ctx.redirect(redirectTo, router.url('root', {}));
    });

    /*
    * RECORDS
    */

    // TODO: Re-add Re-ordering.
    router.post('records#reorder', '/records/reorder', async (ctx) => {
      const { id, from, to, nav } = (ctx.request as any).body as { id: number; from: number; to: number; nav: boolean; };
      const record = await this.provider.getRecordById(id);
      record && await updateRecordPosition(this.provider, record, from, to, nav);
      ctx.status = 200;
    });

    router.post('image#upload', '/upload', async (ctx) => {
      const files: ReadStream[] = (ctx.request as unknown as any).files as ReadStream[] || [];
      if (files.length > 1) {
        ctx.status = 400;
        ctx.body = {
          status: 'error',
          message: 'One file at a time.',
        };
        return;
      }

      const fileUrl = await _saveFile(files[0]);
      ctx.status = 200;
      ctx.body = {
        status: 'success',
        data: { url: `/uploads/${fileUrl}` },
      };
    });

    /*
    * GROUPS
    */

    router.get('sections#pages', '/new', async (ctx) => {
      // Else, this is a single-record type of template. Render the edit page.
      const templates = await this.provider.getTemplatesByType(PageType.PAGE);
      ctx.state.record = null;
      return ctx.render('records/templates', 'New Page', { templates } as unknown as Json);
    });

    router.get('records#new', '/new/:type/(.*)', async (ctx) => {
      const type = ctx.params.type as PageType;
      let slug = ctx.params[0] || 'index';
      if (slug.endsWith('/')) { slug = slug.slice(0, -1); }
      if (slug === '' || slug === '/') { slug = 'index'; }

      let record = slug ? await getRecordFromPath(slug, this.provider) : null;
      let template = record ? await this.provider.getTemplateById(record.templateId) : await this.provider.getTemplateByName(slug, type);
      template = template ? await this.provider.getTemplateByName(template.name, type) : null;
      if (!template) { throw Boom.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`); }

      const tmpl = (await this.provider.getTemplateById(template.id))!;
      const tmpRecord = stampRecord(tmpl);
      tmpRecord.parentId = type === PageType.COLLECTION ? record?.id || null : null

      record = await this.provider.updateRecord(tmpRecord);

      return _editRecordAction(
        ctx,
        type,
        record,
        template,
        new Record(tmpRecord, tmpl),
        [],
      )
    });

    router.post('records#update', '/:type/(.*)', async (ctx) => {
      let slug = ctx.params[0] || 'index';
      if (slug.endsWith('/')) { slug = slug.slice(0, -1); }
      if (slug === '' || slug === '/') { slug = 'index'; }

      const type = ctx.params.type as PageType;
      let record = slug ? await getRecordFromPath(slug, this.provider) : null;
      let template = record ? await this.provider.getTemplateById(record.templateId) : await this.provider.getTemplateByName(slug, type);
      template = template ? await this.provider.getTemplateByName(template.name, type) : null;

      if (!template) {
        throw Boom.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
      }
      record = record || new Record(stampRecord(template), template);

      try {
        const { content, metadata, isDelete } = await _content(template, record, ((ctx.request as any).body || {}) as Json, (ctx.request as any).files as ReadStream[]);

        if (record && isDelete) {
          await this.provider.deleteRecord(record.id);
          ctx.flash('success', `Deleted ${record.nameSingular}`);
          (template.type === 'page') ? ctx.redirect('/dashboard') : ctx.redirect(`/dashboard/${template.type}${template.name}`);
          return;
        }

        if (type === PageType.COLLECTION && record?.template.type !== type) {
          record = await this.provider.updateRecord({
            ...record,
            content,
            metadata,
            parentId: record?.id || null,
          });

          console.log('RECORD', record);

          // If the template is sortable, append the record
          if (template.sortable) {
            await updateRecordPosition(this.provider, record);
          }

          ctx.flash('success', `Created ${record.nameSingular()}`);
        }
        else {
          record = await this.provider.updateRecord({ ...record, content, metadata })
          ctx.flash('success', `Updated ${record.nameSingular()}`);
        }

        console.log('WAT', record, record.permalink());

        const name = template.type !== 'settings' ? record.permalink() : `/${template.name}`;
        return ctx.redirect(`/dashboard/${template.type}${name}`);
      } catch (err) {
        console.error('erro', err);
        if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
          ctx.flash('error', 'Please fix the following errors, then resubmit.');
          // await _editRecordAction(ctx, record.toJSON(), err.errors);
        } else {
          throw err;
        }
      }
    });

    router.get('sections#index', '/:type/(.*)', async (ctx, errors) => {
      let slug = ctx.params[0] || 'index';
      if (slug.endsWith('/')) { slug = slug.slice(0, -1); }
      if (slug === '' || slug === '/') { slug = 'index'; }

      const type = ctx.params.type as PageType;
      const record = slug ? await getRecordFromPath(slug, this.provider) : null;
      let template = record ? await this.provider.getTemplateById(record.templateId) : await this.provider.getTemplateByName(slug, type);
      template = template ? await this.provider.getTemplateByName(template.name, type) : null;

      if (!template) {
        throw Boom.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
      }

      ctx.state.template = template.toJSON();
      ctx.state.record = record?.toJSON() || null;

      // If this is the type of template that contain multiple records, render the records list page.
      if (type === 'collection' && (!record || !record?.template.isCollection())) {
        const tableAction = template.sortable ? 'draggable' : 'sortable';
        const records = (await this.provider.getRecordsByTemplateId(template.id)).map(r => r.toJSON());
        return ctx.render('records/index', template.label(), {
          page: (await this.provider.getTemplateByName(template.name, PageType.PAGE))?.toJSON() as unknown as Json,
          collection: (await this.provider.getTemplateByName(template.name, PageType.COLLECTION))?.toJSON() as unknown as Json,
          pageRecord: (record?.toJSON() || null) as unknown as Json,
          record: null,
          template: template.toJSON() as unknown as Json,
          tableAction,
          records: records as unknown as Json,
          csrf: ctx.csrf || '',
          Form: Form as unknown as Json,
          errors: _errors(errors as unknown as Error[]),
          previewContent: (((record: IRecord, fieldName: string, section: ITemplate) => {
            const directive = directives.find(section.fields[fieldName]);
            /* @ts-ignore */
            const rendered = directive.preview(record.content[fieldName]);
            return rendered && rendered.length > 140 ? `${rendered.slice(0, 140)}...` : rendered;
          }) as unknown) as number
        });
      }

      // If there are no records created for this template type yet, render the new record page.
      if (!record) {
        // @ts-ignore
        return ctx.redirect(router.url('records#new', template.type, template.name));
      }

      const pageRecord = type === PageType.PAGE ? record : (record.parentId ? await this.provider.getRecordById(record.parentId) : null);

      // Else, this is a single-record type of template. Render the edit page.
      return _editRecordAction(
        ctx,
        type,
        pageRecord,
        template,
        record,
      );
    });

    async function _content(template: Template, record: Record | null, body: Json, files: ReadStream[]) {
      const metadataFields = ['name', 'slug', 'title', 'description', 'redirectUrl'];
      const allowedFields = new Set(Object.keys(template.fields));
      const promises = [];

      const content = Object.assign({}, record?.content || {});
      // Only make allowed fields available.
      if (body.content) {
        for (const field of allowedFields) {
          content[field] = body.content[field];
        }
      }

      const metadata = Object.assign({}, record?.metadata || {});
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
        const fieldName = (file as any).fieldname.match(/content\[(.*)\]/)[1];
        if (allowedFields.has(fieldName)) {
          promises.push(_saveFile(file).then((c) => { content[fieldName] = c; }));
        }
      }

      await Promise.all(promises);

      // Process destroys
      for (const fieldName of Object.keys(body._destroy || {})) {
        delete content[fieldName];
      }

      return { content, metadata, isDelete: body._delete === 'true' };
    }

    const _saveFile = async (file: ReadStream) => {
      const fileName = _fileDigest(file);
      const savePath = resolve(this.options.uploadsDir, fileName);
      const buffer = readFileSync(file.path);

      // TODO: Ensure that EXIF rotated images are oriented correctly
      writeFileSync(savePath, buffer, { encoding: 'binary' });

      return fileName;
    }

    function _fileDigest(file: ReadStream) {
      const hash = checksum(file.path.toString(), () => {});
      const { name, ext } = parse((file as any).filename);

      return `${toSnakeCase(name)}-${hash}${ext}`;
    }

  }


  /**
   * Returns routes
   */
  get routes() {
    return this.router.routes();
  }
}
