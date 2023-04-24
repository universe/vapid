import { deploy, makePublic } from '@cannery/hoist';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
// import csrf from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import serveStatic from '@fastify/static';
import { IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType,  Record, sortRecords, stampRecord, Template } from '@neutrino/core';
import { Vapid, VapidSettings } from '@neutrino/runner';
import type { IParsedTemplate, IWebsite } from '@neutrino/runtime';
import { Json, uuid } from '@universe/util';
import * as blurhash from 'blurhash';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import favicon from 'fastify-favicon';
import * as fs from 'fs';
// import findUp from 'find-up';
import { imageSize } from 'image-size';
import fetch from 'node-fetch';
import normalizeUrl from 'normalize-url';
import * as path from 'path';
import pino from 'pino';
import sharp from 'sharp';
import { unfurl } from 'unfurl.js';

import VapidBuilder from '../VapidBuilder/index.js';
import Watcher from './watcher.js';

// const __dirname = new URL('./index', import.meta.url).pathname;

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const app = fastify({ logger: false });

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

    app.setErrorHandler(async(error, _request, _reply) => ({ status: error.code || 500, title: error.message, message: error.message, stack: error.stack }));

    app.register(favicon, { path: this.paths.www });
    app.register(helmet, { contentSecurityPolicy: false, frameguard: false });
    app.register(cookie, { secret: process.env.SECRET_KEY || uuid() });
    // app.register(csrf, { cookieOpts: { signed: true } });
    app.register(cors, { origin: '*' });
    app.register(multipart);
    app.register(serveStatic, { root: path.join(this.paths.www, 'static'), prefix: '/static/' });

    // Do not serve private files.
    app.addHook('onRequest', async(req, res): Promise<FastifyReply | undefined> => {
      const url = path.parse(req.url);
      return url.name.startsWith('_') || url.name.startsWith('.') ? res.code(404).send() : void 0;
    });

    app.get('/api/deploy', (_req, res) => {
      const staticBuildPath = path.join(this.paths.root, 'dist');
      const builder = new VapidBuilder(this.paths.root, this.config);
      (async() => {
        try { await builder.build(staticBuildPath); }
        catch (err) { logger.error(err); throw err; }
        const siteUrl = await deploy(staticBuildPath, '', this.config.domain, {
          info: logger.info.bind(logger),
          error: logger.error.bind(logger),
          warn: logger.warn.bind(logger),
          progress: (progress) => {
            this.watcher?.broadcast({ command: 'upload', data: progress });
          },
        });
        await makePublic(staticBuildPath, this.config.domain);
        this.watcher?.broadcast({ command: 'redirect', data: siteUrl });
      })();
      res.code(200).send({ status: 'success' });
    });

    const saveRecord = async(req: FastifyRequest, res: FastifyReply) => {
      const body: Json = req.body as Json;
      const id = (typeof body.id === 'string' ? body.id : null);
      const parentId = (typeof body.parentId === 'string' ? body.parentId : null);
      if (!id) { throw new Error('Record ID is required.'); }

      const isDelete = req.method === 'DELETE';
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
          if (parentId !== NAVIGATION_GROUP_ID && parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
          record = stampRecord(template, { parentId });
        }
        else {
          if (!template) { throw new Error(`Could not find template "${record?.templateId}".`); }
          if (template.type === PageType.COLLECTION && !parentId) { throw new Error(`Parent record ID is required.`); }
          const parent = parentId ? await db.getRecordById(parentId) : null;
          if (parentId !== NAVIGATION_GROUP_ID && parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
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
        logger.info(JSON.stringify(record, null, 2));
        logger.info(`${isDelete ? 'Deleting' : 'Saving'} ${record.id}: ${Record.permalink(record)}`);
        await isDelete ? db.deleteRecord(record.id) : db.updateRecord(record);
        return res.code(200).send({ status: 'success' });
      }
      catch (err) {
        return res.code(400).send({ status: 'error', message: err.message });
      }
    };

    app.get('/api/data/*', async(_req: FastifyRequest, res: FastifyReply) =>  res.code(200).send(await this.getTheme()));
    app.post('/api/record', saveRecord);
    app.delete('/api/record', saveRecord);

    app.post('/api/reorder', async(req: FastifyRequest, res: FastifyReply) => {
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

    app.post('/api/upload', async(req: FastifyRequest, res: FastifyReply) => {
      const ACCEPTED_IMAGE_FORMATS = new Set([ '.jpg', '.jpeg', '.png', '.webp' ]);
      const response: { status: string; csrf?: string; data: Json } = {
        status: 'success',
        // csrf: await res.generateCsrf(),
        data: {},
      };
      for await (const part of req.parts()) {
        logger.info('Processing an image');
        if (part.file) {
          const { name, ext } = path.parse(part.filename);
          const fileName = `${name}${ext}`;
          logger.info(`Processing image ${fileName} ${ACCEPTED_IMAGE_FORMATS.has(ext)} ${part}`);
          if (!fileName || !ACCEPTED_IMAGE_FORMATS.has(ext)) { part.file.resume(); continue; }

          let resUrl: string | null = null;
          for await (const res of this.database.saveFile(part.file as unknown as File, fileName)) {
            if (res.status === 'success') {
              resUrl = res.url;
            }
          }
          if (!resUrl) { throw new Error(`Failed to safe image.`);}

          const data = await (await fetch(resUrl)).buffer();

          const size = imageSize(data) || { width: 1, height: 1, type: 'gif' };
          const blurhashRes = await new Promise((resolve, reject) => sharp(data)
            .raw()
            .ensureAlpha()
            .resize(128, null)
            .toBuffer((err, buffer, { width, height }) => {
              if (err) return reject(err);
              resolve(blurhash.encode(new Uint8ClampedArray(buffer), width, height, 4, 4));
            }));
            logger.info('Processing image', 3);
          response.data[part.fieldname] = response.data[part.fieldname] || {
            src: resUrl,
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

    app.get('/api/unfurl/:url', async(req: FastifyRequest, res: FastifyReply) => {
      let { url } = req.params as { url: string; };
      url = normalizeUrl(url);
      try {
        logger.info(`Unfurling ${url}.`);
        const data = await unfurl(url);
        logger.info(`Unfurled ${JSON.stringify(data)}`);
        res.code(200).send(data);
      }
      catch (err) {
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
      this.watcher?.broadcast({ command: 'update', data: await this.getTheme() });
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

  private async getTheme(): Promise<IWebsite> {
    const siteData: IWebsite = {
      meta: {
        name: this.config.name,
        domain: this.config.domain,
        media: await this.database.mediaUrl(),
        theme: {
          name: this.config.name,
          version: '0.0.1',
        },
      },
      hbs: await this.compiler.parse(this.paths.www),
    };

    fs.writeFileSync('./site.json', JSON.stringify(siteData));
    return siteData;
  }

  /**
   * Parses templates and updates the database
   */
   private async rebuild(): Promise<void> {
    try {
      const tree = await this.compiler.parse(this.paths.www);
      const templates: { [templateId: string]: ITemplate } = {};
      const saves: Promise<ITemplate>[] = [];
      // Update every template in our database.
      // TODO: Only save templates that have changes.
      for (const ctx of Object.values(tree) as IParsedTemplate[]) {
        for (const template of Object.values(ctx.templates || {})) {
          const id = Template.id(template);
          if (templates[id]) { continue; }
          templates[id] = template;
          saves.push(this.database.updateTemplate(template));
        }
      }
      await Promise.all(saves);
    }
 catch (err) {
      console.error(err);
      this.watcher?.broadcast({ command: 'error', data: err });
    }
  }
}
