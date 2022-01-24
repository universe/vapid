import * as fs from 'fs';
import * as path from 'path';
import replaceStream from 'replacestream';
import { escape } from 'html-escaper';
import * as blurhash from 'blurhash';
import sharp from 'sharp';
import { unfurl } from 'unfurl.js';
import normalizeUrl from 'normalize-url';
import fetch from 'node-fetch';

import { Json, uuid } from '@universe/util';
import { deploy, Logger, makePublic } from '@cannery/hoist';
import pino from 'pino';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import findUp from 'find-up';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';
import { imageSize } from 'image-size';

import cookie from 'fastify-cookie';
import csrf from 'fastify-csrf';
import helmet from 'fastify-helmet';
import serveStatic from 'fastify-static';
import multipart from 'fastify-multipart';
import favicon from 'fastify-favicon';

import { Record, stampRecord, PageType, Template, IRecord, ITemplate, sortRecords } from '../../Database/models';
import VapidBuilder from '../VapidBuilder';
import Vapid, { VapidSettings } from '../Vapid';
import Watcher from './watcher';
import { IMedia, IParsedTemplates, ISite } from '../../TemplateRuntime';

const DASHBOARD_ASSETS = path.join(findUp.sync('assets', { type: 'directory', cwd: __dirname })!, 'dashboard');
if (!DASHBOARD_ASSETS) { throw new Error('Unable to find dashboard assets directory.') };

const logger = pino();
const app = fastify({ logger: false });

function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: Error) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}

export interface ISiteData {
  site: ISite;
  media: IMedia;
  records: { [recordId: string]: IRecord };
  hbs: IParsedTemplates;
  csrf: string;
}

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
  constructor(cwd: string, config: Partial<VapidSettings> = {}) {
    super(cwd, config);
    this.watcher = new Watcher(this.paths.www);
    const db = this.database;

    app.setErrorHandler(async (error, _request, _reply) => {
      return { status: error.code || 500, title: error.message, message: error.message, stack: error.stack };
    });

    app.addHook('onSend', async (req, _res, payload) => {
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

    app.register(favicon, { path: DASHBOARD_ASSETS });
    app.register(helmet, { contentSecurityPolicy: false, frameguard: false });
    app.register(cookie, { secret: process.env.SECRET_KEY || uuid() });
    app.register(csrf, { cookieOpts: { signed: true } });
    app.register(multipart);
    app.register(serveStatic, { root: path.join(this.paths.www, 'static'), prefix: '/static/' });
    app.register(serveStatic, { root: this.paths.uploads, prefix: '/uploads/', decorateReply: false });
    app.register(serveStatic, { root: DASHBOARD_ASSETS, prefix: '/dashboard/static/', decorateReply: false });

    app.addHook('onRequest', async (req, res): Promise<FastifyReply | undefined> => {
      // Do not serve private files.
      const url = path.parse(req.url);
      if (url.name.startsWith('_') || url.name.startsWith('.')) {
        res.code(404);
        return res.send();
      }
      return;
    });

    app.get('/dashboard/deploy', async (_req, res) => {
      const staticBuildPath = path.join(this.paths.root, 'dist');
      const builder = new VapidBuilder(this.paths.root, this.config);
      try { await builder.build(staticBuildPath); }
      catch (err) { logger.error(err); throw err; }
      const siteUrl = await deploy(staticBuildPath, undefined, undefined, logger as unknown as Logger, false);
      await makePublic(staticBuildPath);
      res.redirect(siteUrl);
    });

    const saveRecord = async (req: FastifyRequest, res: FastifyReply) => {
      const body: Json = req.body as Json;
      const id = (typeof body.id === 'string' ? body.id : null);
      const parentId = (typeof body.parentId === 'string' ? body.parentId : null);
      if (!id) { throw new Error('Record ID is required.'); }

      let isDelete = req.method === 'DELETE';
      let record = await db.getRecordById(id);
      let template = record?.templateId ? await db.getTemplateById(record?.templateId) : null;

      try {
        if (!record) {
          const templateId = (typeof body.templateId === 'string' ? body.templateId : null);
          if (!templateId) { throw new Error('Template ID is required for new records.'); }
          template = await db.getTemplateById(templateId);
          if (!template) { throw new Error(`Could not find template "${templateId}".`); }
          if (template.type === PageType.COLLECTION && !parentId) { throw new Error(`Parent record ID is required.`); }
          const parent = parentId ? await db.getRecordById(parentId) : null;
          if (parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
          record = stampRecord(template, { parentId });
        }
        else {
          if (!template) { throw new Error(`Could not find template "${record?.templateId}".`); }
          if (template.type === PageType.COLLECTION && !parentId) { throw new Error(`Parent record ID is required.`); }
          const parent = parentId ? await db.getRecordById(parentId) : null;
          if (parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
        }

        const metadataFields = new Set(Object.keys(template.metadata));
        const contentFields = new Set(Object.keys(template.fields));

        // Save data
        record.content = Object.assign({}, record.content || {});
        record.metadata = Object.assign({}, record.metadata || {});

        // Only explicitly allowed fields are editable.
        body.content = body.content || {};
        body.metadata = body.metadata || {};
        for (const field of contentFields) { record.content[field] = Object.hasOwnProperty.call(body.content, field) ? body.content?.[field] : record.content[field]; }
        for (const field of metadataFields) { record.metadata[field] = Object.hasOwnProperty.call(body.metadata, field) ? body.metadata?.[field] : record.metadata[field]; }

        // Save all well known page data values.
        record.id = (typeof body.id === 'string' ? body.id : null)  || record.id;
        record.parentId = (typeof body.parentId === 'string' ? body.parentId : null)  || record.parentId;
        record.name = (typeof body.name === 'string' ? body.name : null)  || record.name;
        record.slug = (typeof body.slug === 'string' ? body.slug : null) || record.slug;
        record.createdAt = (typeof body.createdAt === 'number' ? body.createdAt : null) || record.createdAt;
        record.updatedAt = (typeof body.updatedAt === 'number' ? body.updatedAt : null) || record.updatedAt;

        // Ensure our slug doesn't contain additional slashes.
        if (record.slug) { record.slug = `${record.slug || ''}`.replace(/^\/+/, ''); }
        logger.info(JSON.stringify(record, null, 2))
        logger.info(`${isDelete ? 'Deleting' : 'Saving'} ${record.id}: ${Record.permalink(record)}`);
        await isDelete ? db.deleteRecord(record.id) : db.updateRecord(record);
        return res.code(200).send({ status: 'success' });
      }
      catch (err) {
        return res.code(400).send({ status: 'error', message: err.message });
      }
    }

    const getBasePage = async (_req: FastifyRequest, res: FastifyReply) => {
      const siteData = await this.getSiteData();
      res.code(200)
      res.type('text/html')
      return fs.createReadStream(path.join(DASHBOARD_ASSETS, 'index.html')).pipe(replaceStream('{{siteData}}', escape(JSON.stringify(siteData))));
    }

    app.get('/:type', getBasePage);
    app.get('/:type/:templateName', getBasePage);
    app.get('/:type/:templateName/:pageSlug', getBasePage);
    app.get('/:type/:templateName/:pageSlug/:collectionSlug', getBasePage);

    app.post('/api/record', saveRecord);
    app.delete('/api/record', saveRecord);

    app.post('/api/reorder', async function reorderRecord(req: FastifyRequest, res: FastifyReply) {
      const { id, to, parentId } = req.body as { id: string; from: number; to: number; parentId: string; };
      const foundRecord = await db.getRecordById(id);
      if (!foundRecord) { return res.code(404).send({ status: 'error', message: 'Record not found.' }); }

      const records = (await db.getChildren(parentId)).sort(sortRecords);
      const newRecords: IRecord[] = [];

      for (let i=0; i < records.length; i++) {
        if (records[i].id === id) { continue; }
        newRecords.push(records[i]);
      }
      foundRecord.parentId = parentId;
      foundRecord && newRecords.splice(to, 0, foundRecord);

      for (let i=0; i < newRecords.length; i++) {
        const record = newRecords[i];
        record.order = i;
        await db.updateRecord(record);
      }

      return res.code(200).send({ status: 'success' });
    });

    app.post('/api/upload', async (req: FastifyRequest, res: FastifyReply) => {
      const ACCEPTED_IMAGE_FORMATS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
      const response: { status: string; csrf: string; data: Json } = {
        status: 'success',
        csrf: await res.generateCsrf(),
        data: {},
      };
      for await (const part of req.parts()) {
        if (part.file) {
          const { name, ext } = path.parse(part.filename);
          const fileName = `${name}${ext}`;
          if (!fileName || !ACCEPTED_IMAGE_FORMATS.has(ext)) { part.file.resume(); continue; }
          const hashName = await this.database.saveFile(fileName, part.file);
          const data = await (await fetch(await this.database.mediaUrl(hashName))).buffer();
          const size = imageSize(data) || { width: 1, height: 1, type: 'gif' };
          const blurhashRes = await new Promise((resolve, reject) => sharp(data)
            .raw()
            .ensureAlpha()
            .resize(128, null)
            .toBuffer((err, buffer, { width, height }) => {
              if (err) return reject(err);
              resolve(blurhash.encode(new Uint8ClampedArray(buffer), width, height, 4, 4));
            }));
          console.log('BLUR_HASH', blurhashRes)
          response.data[part.fieldname] = response.data[part.fieldname] || {
            src: hashName,
            width: size.width || 1,
            height: size.height || 1,
            type: size.type || 'gif',
            aspectRatio: (size.height && size.width) ? (size.height / size.width) : 1,
            blurhash: blurhashRes,
          } as unknown as Json;
        }
      }
      return res.code(200).send(response);
    });

    app.get('/api/unfurl/:url', async function unfurlUrl(req: FastifyRequest, res: FastifyReply) {
      let { url } = req.params as { url: string; };
      url = normalizeUrl(url);
      try {
        logger.info(`Unfurling ${url}.`);
        const data = await unfurl(url);
        logger.info(`Unfurled ${JSON.stringify(data)}`);
        res.code(200).send(data);
      } catch (err) {
        logger.error(`Error Unfurling ${url}`);
        logger.error(err);
        res.code(500);
        throw err;
      }
      return res;
    });
  }

  /**
   * Starts core services (db, watcher, web server)
   * and registers callbacks
   */
  async start() {
    await this.database.start();
    await this.rebuild();

    // Start livereload.
    // Trigger liveReload when DB changes
    this.watcher.listen(async() => {
      await this.rebuild();
      this.watcher?.broadcast({ command: 'update', data: await this.getSiteData() });
    });

    await app.listen(this.config.port || 3000);
  }

  /**
   * Safely stops the services
   */
  stop() {
    app.server.close();
    this.database.stop();
  }

  private async getSiteData() {
    const templates: ITemplate[] = await this.database.getAllTemplates();
    const records: IRecord[] = await this.database.getAllRecords();
    const siteData: ISiteData = {
      site: {
        name: this.config.name,
        domain: this.config.domain,
      },
      media: {
        host: await this.database.mediaUrl(),
      },
      records: {},
      hbs: { pages: {}, templates: {}, components: {} },

      csrf: '', // await res.generateCsrf(),
    };

    for (const record of records) {
      siteData.records[record.id] = record;
    }

    const tree = await this.compiler.parse(this.paths.www);
    for (const template of templates) {
      const id = Template.id(template);
      siteData.hbs.templates[Template.id(template)] = template;
      const parsed = tree[id];
      if (!parsed) { continue; }
      siteData.hbs.pages[id] = { name: parsed.name, type: parsed.type, ast: parsed.ast };
      siteData.hbs.components = { ...siteData.hbs.components, ...parsed.components };
    }
    return siteData;
  }

  /**
   * Parses templates and updates the database
   */
   private async rebuild() {
    const tree = this.compiler.parse(this.paths.www);
    const templates: { [templateId: string]: ITemplate } = {};
    const existing: Promise<ITemplate>[] = [];
    debugger;
    // For every unique template file, update our database.
    for (let ctx of Object.values(tree)) {
      for (let template of Object.values(ctx.templates)) {
        const id = Template.id(template);
        if (templates[id]) { continue; }
        templates[id] = template;
        existing.push(this.database.updateTemplate(template));
      }
    }

    await Promise.all(existing);
  }
}
