import checksum from 'md5-file';
import * as pluralize from 'pluralize';
import { toSnakeCase, Json } from '@universe/util';

import { Paths } from '../../../utils';

import { join, parse, resolve } from 'path';
import assert from 'assert';
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
import { Record } from '../../../Database/models/Record';
import { PageType, Template } from '../../../Database/models/Template';


// import services from '../../../services';
import VapidBuilder from '../../VapidBuilder';
import middleware from '../middleware';
import Database from '../../../Database';
import { IProvider } from '../../../Database/providers';

import Form from '../../../form';

interface IKoaContext {
  csrf: string | undefined,
  flash: (type: 'success' | 'error' | 'warning', message: string) => void;
  render: (relPath: string, title: string, locals?: Json) => Promise<void>;
  pages: Record[];
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
  private router = new Router<any, IKoaContext>({ prefix: '/dashboard' });
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
    ctx.state.record = await this.provider.getIndex() || await this.provider.getGeneral();
    ctx.state.template = ctx.state.record.template;
    await next();
  }

  const findPage = async (ctx: Koa.Context, next: () => void) => {
    const permalink = ctx.params[0].split('/').filter(Boolean).join('/');
    console.log(permalink)
    const record = await getRecordFromPath(permalink, this.provider);
    if (record) {
      ctx.state.template = record.template;
      ctx.state.record = record;
      await next();
    } else {
      throw Boom.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
    }
  }

  const findSection = async (ctx: Koa.Context, next: () => void) => {
    const type = pluralize.singular(ctx.params.type);
    const { name } = ctx.params;
    const template = await this.provider.getTemplateByName(name, type as PageType);

    if (template) {
      // TODO: This seems to be the only way to get the defaultScope/ordering to work
      const records = await this.provider.getRecordsByTemplateId(template.id);
      (template as any).records = records;
      ctx.state.template = template;
      await next();
    } else {
      throw Boom.notFound(`Template ${ctx.params.type}:${ctx.params.name} not found`);
    }
  }

  const findRecord = async (ctx: Koa.Context, next: () => void) => {
    const record = await this.provider.getRecordById(ctx.params.id);

    if (record) {
      ctx.state.record = record;
      ctx.state.template = record.template;
      await next();
    } else {
      throw Boom.notFound(`Record ${ctx.params.type}:${ctx.params.name}:${ctx.params.id} not found`);
    }
  }

  const _newRecordAction = async (ctx: Koa.Context, options: { title?: string } = {}, errors: Error[]) => {
    const body: { content?: Json; metadata?: Json } = (ctx.request as any).body;
    let { template, record } = ctx.state;
    record = record || await this.provider.updateRecord({
      id: -1,
      content: body.content || {},
      metadata: body.metadata || {},
      templateId: template.id,
      position: 0,
      slug: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const title = options.title || template.type === 'setting'
      ? template.labelSingular
      : `New ${template.labelSingular} ${template.type === 'page' ? 'Page' : ''}`;

    await ctx.render('records/edit', title, {
      isNewRecord: true,
      collection: (await this.provider.getTemplateByName(template.name, PageType.COLLECTION))?.toJSON(),
      page: (await this.provider.getTemplateByName(template.name, PageType.PAGE))?.toJSON(),
      template: template?.toJSON(),
      record: record?.toJSON(),
      action: router.url('records#create', template.typePlural, template.name),
      errors: Array.isArray(errors) ? _errors(errors) : undefined,
      Form,
      ...options,
    });
  }

  const _editRecordAction = async (ctx: Koa.Context, record: Record, errors = []) => {
    const { template } = ctx.state;
    await ctx.render('records/edit', template.type === 'page' ? record.name() : record.nameSingular(), {
      isNewRecord: false,
      collection: (await this.provider.getTemplateByName(template.name, PageType.COLLECTION))?.toJSON(),
      page: (await this.provider.getTemplateByName(template.name, PageType.PAGE))?.toJSON(),
      template: template?.toJSON(),
      record: record?.toJSON(),
      action: router.url('records#update', { type: template.typePlural, name: template.name, id: record.id || '0' }),
      deletePath: router.url('records#delete',  { type: template.typePlural, name: template.name, id: record.id || '0' }),
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
      console.log(ctx.state.template);
      ctx.redirect(router.url('sections#index', { type: ctx.state.template.typePlural(), name: ctx.state.template.name }));
    });

    this.router.use(async (ctx, next) => {
      // For the nav menu
      ctx.state.settings = await this.provider.getTemplatesByType(PageType.SETTINGS);

      // Get all page records.
      const pages = [...await this.provider.getRecordsByType(PageType.PAGE)].map(p => p.toJSON());

      const collections = await this.provider.getTemplatesByType(PageType.COLLECTION);

      ctx.state.pages = pages;
      ctx.state.collections = collections.map(c => c.toJSON());
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
      console.log('site url', siteUrl);
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

    router.get('records#new', '/:type/:name/records/new', findSection, async (ctx) => {
      await _newRecordAction(ctx, {}, []);
    });

    router.get('collection#view', '/:type/:name/records/:id', findRecord, async (ctx) => {
      return _editRecordAction(ctx, ctx.state.record);
    });

    // TODO: Re-add Re-ordering.
    router.post('records#reorder', '/records/reorder', async (ctx) => {
      // const { id, from, to, nav } = ctx.request.body;
      // const record = await this.provider.getRecordById(id);
      // await new services.RecordPositionUpdater(record, from, to, nav).perform(db);
      ctx.status = 200;
    });

    router.post('records#create', '/:type/:name/records', findSection, async (ctx) => {
      const template = ctx.state.template as Template;
      let record;

      try {
        const { content, metadata } = await _content(ctx);
        record = await this.provider.updateRecord({
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
      } catch (err) {
        console.error(err);
        if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
          ctx.flash('error', 'Please fix the following errors, then resubmit.');
          await _newRecordAction(ctx, {}, err.errors);
        } else {
          throw err;
        }
      }
    });

    router.post('records#update', '/:type/:name/records/:id', findRecord, async (ctx) => {
      const { record } = ctx.state;
      try {
        const { template } = record as Record;
        const { content, metadata } = await _content(ctx);

        // If new record is not equal to the old one, update the record in our DB.
        try {
          assert.deepStrictEqual(record.content, content);
          assert.deepStrictEqual(record.metadata, metadata);
        } catch (_err) {
          await record.update({ content, metadata });
          ctx.flash('success', `Updated ${record.nameSingular}`);
        }

        if (template.type !== 'page') {
          ctx.redirect(router.url('sections#index', { type: template.typePlural(), name: template.name }));
        } else {
          ctx.redirect(router.url('sections#index', { type: template.typePlural(), name: record.safeSlug() }));
        }
      } catch (err) {
        if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
          ctx.flash('error', 'Please fix the following errors, then resubmit.');
          await _editRecordAction(ctx, record, err.errors);
        } else {
          throw err;
        }
      }
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

      router.get('records#delete', '/:type/:name/records/:id/delete', findRecord, async (ctx) => {
      const title = ctx.state.template.labelSingular;
      await ctx.render('records/delete', `Delete ${title}`);
      });

      router.post('/:type/:name/records/:id/delete', findRecord, async (ctx) => {
      await ctx.state.record.destroy();
      ctx.flash('success', `Deleted ${ctx.state.record.nameSingular}`);
      if (ctx.state.template.type === 'page') {
        ctx.redirect('/dashboard');
      } else {
        ctx.redirect(router.url('sections#index', { type: ctx.state.template.typePlural(), name: ctx.state.template.name }));
      }
    });

    /*
    * GROUPS
    */

    router.get('sections#pages', '/pages', async (ctx) => {
      // Else, this is a single-record type of template. Render the edit page.
      const templates = [];
      for (const t of await this.provider.getTemplatesByType(PageType.PAGE)) {
        templates.push(t);
      }
      return ctx.render('records/templates', 'New Page', { templates } as unknown as Json);
      });

      router.get('sections#page', '/pages/(.*)', findPage, async (ctx) => {
      const { record } = ctx.state;

      // Else, this is a single-record type of template. Render the edit page.
      return _editRecordAction(ctx, record);
      });

      router.get('sections#index', '/:type/:name', findSection, async (ctx, errors) => {
      const { template } = ctx.state;
      // If there are no records created for this template type yet, render the new record page.
      if (template.records.length === 0) {
        return ctx.redirect(router.url('records#new', template.typePlural, template.name));

      // If this is the type of template that contain multiple records, render the records list page.
      } else if (template.type === 'collection') {
        const tableAction = ctx.state.template.sortable ? 'draggable' : 'sortable';
        return ctx.render('records/index', ctx.state.template.label, {
          collection: (await this.provider.getTemplateByName(template.name, PageType.COLLECTION))?.toJSON() as unknown as Json,
          page: (await this.provider.getTemplateByName(template.name, PageType.PAGE))?.toJSON() as unknown as Json,
          tableAction,
          csrf: ctx.csrf || '',
          Form: Form as unknown as Json,
          errors: Array.isArray(errors) ? _errors(errors as unknown as Error[]) : null,
        });
      }

      // Else, this is a single-record type of template. Render the edit page.
      return _editRecordAction(ctx, template.records[0]);
    });

    async function _content(ctx: Koa.Context) {
      const metadataFields = ['name', 'slug', 'title', 'description', 'redirectUrl'];
      const body: Json = (ctx.request as any).body;
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
      for (const file of (ctx.request as any).files as ReadStream[]) {
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

      return { content, metadata };
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
