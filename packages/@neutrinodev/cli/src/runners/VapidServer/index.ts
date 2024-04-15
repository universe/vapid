import cors from '@fastify/cors';
import serveStatic from '@fastify/static';
import { ITemplate, Template,Vapid, VapidSettings } from '@neutrinodev/runner';
import type { IParsedTemplate, IWebsite } from '@neutrinodev/runtime';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';

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

    app.setErrorHandler(async(error, _request, _reply) => ({ status: error.code || 500, title: error.message, message: error.message, stack: error.stack }));

    app.register(cors, { origin: '*' });
    app.register(serveStatic, { root: path.join(this.paths.www, 'static'), prefix: '/static/' });

    // Do not serve private files.
    app.addHook('onRequest', async(req, res): Promise<FastifyReply | undefined> => {
      const url = path.parse(req.url);
      return url.name.startsWith('_') || url.name.startsWith('.') ? res.code(404).send() : void 0;
    });

    app.get('/api/data/*', async(_req: FastifyRequest, res: FastifyReply) =>  res.code(200).send(await this.getTheme()));
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
      logger.info('Rebuilding...');
      await this.rebuild();
      logger.info('Rebuilt');
      this.watcher?.broadcast({ command: 'update', data: await this.getTheme() });
    });

    await app.listen({
      port: this.config.port || 3000,
    });
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
        env: {},
        theme: {
          name: this.config.name,
          version: 'latest',
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
