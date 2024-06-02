import cors from '@fastify/cors';
import serveStatic from '@fastify/static';
import { TemplateCompiler } from '@neutrinodev/compiler';
import { type ITheme, resolveHelper } from '@neutrinodev/runtime';
import type { Json } from '@universe/util';
import dotenv from 'dotenv';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { mkdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { join, resolve } from 'path';
import pino from 'pino';

import Watcher from './watcher.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const app = fastify({ logger: false });

export interface Configuration {
  name?: string;
}

interface ProjectPaths {
  pjson: string;
  root: string;
  data: string;
  cache: string;
  www: string;
  static: string;
  modules: string;
}

interface PJson {
  name?: string;
  version?: string;
  neutrino?: Configuration;
}

/**
 * This is the Neutrino development server.
 * The `Server` class provides a developer server that 
 * enables easy site development.
 */
export default class DevServer {
  port: number;
  paths: ProjectPaths;
  compiler: TemplateCompiler;
  watcher: Watcher;
  pjson: PJson = {};

  /**
   * This module works in conjunction with a site directory.
   *
   * @param {string} cwd - path to site
   * @return {Server}
   */
  constructor(cwd: string) {
    // Resolves commonly-used project paths
    this.paths = {
      pjson: resolve(cwd, 'package.json'),
      root: resolve(cwd, '.'),
      data: resolve(cwd, './data'),
      cache: resolve(cwd, join('./data', 'cache')),
      www: resolve(cwd, './www'),
      static: resolve(cwd, './www/static'),
      modules: resolve(cwd, './node_modules'),
    };

    // Load project .env file if present.
    dotenv.config({ path: join(this.paths.root, '.env') });

    // Now that we've loaded our env, grab our port number.
    this.port = process.env.PORT ? (parseInt(process.env.PORT, 10) || 3000) : 3000;

    // Ensure paths exist
    mkdirSync(this.paths.www, { recursive: true });
    mkdirSync(this.paths.static, { recursive: true });

    // TODO: Ensure package.json is present.
    this.pjson = JSON.parse(readFileSync(this.paths.pjson, 'utf-8'));

    // Pull in the project's env vars.
    dotenv.config({ path: resolve(cwd, '.env') });

    const componentLookup = (tag: string): string | null => {
      try { return readFileSync(join(this.paths.www, 'components', `${tag}.html`), 'utf8'); }
      catch { return null; }
    };
    this.compiler = new TemplateCompiler(componentLookup, resolveHelper);

    // Start our watcher. On any new connection, send them the theme.
    this.watcher = new Watcher(this.paths.www, async () => {
      return { command: 'update', data: await this.getTheme() } as unknown as Json;
    });

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
    // Start livereload.
    // Trigger liveReload when DB changes
    this.watcher.listen(async() => {
      logger.info('Site Connected');
      this.watcher?.broadcast({ command: 'update', data: await this.getTheme() });
    });

    await app.listen({ port: this.port });
  }

  /**
   * Safely stops the services
   */
  stop() {
    app.server.close();
  }

  private async getTheme(): Promise<ITheme> {
    this.pjson = JSON.parse(readFileSync(this.paths.pjson, 'utf-8'));
    const theme = await this.compiler.parse(this.paths.www);
    theme.name = this.pjson.neutrino?.name || this.pjson.name || '';
    theme.version = this.pjson.version || '';
    return theme;
  }
}
