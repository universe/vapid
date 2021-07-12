import { resolve, join } from 'path';
import * as mkdirp from 'mkdirp';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

import Database from '../Database';
import { MemoryProvider } from '../Database/providers';
import { TemplateCompiler } from '../TemplateCompiler';
import { NeutrinoHelper } from '../TemplateCompiler/types';

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      TEMPLATES_PATH: string;
      PORT: string;
    }
  }
}

interface VapidProjectPaths {
  pjson: string;
  root: string;
  data: string;
  cache: string;
  uploads: string;
  www: string;
  modules: string;
}

export interface VapidSettings {
  cache: boolean;
  database: {
    dialect: 'memory' | 'sqlite' | 'firebase';
    logging: false;
  };
  dataPath: string;
  liveReload: boolean;
  placeholders: boolean;
  port: number;
}

export interface VapidPublicSettings {
  name: string;
  domain: string;
}

/**
 * Resolves commonly-used project paths
 */
export function getProjectPaths(cwd: string, dataPath: string): VapidProjectPaths {
  const paths: VapidProjectPaths = {
    pjson: resolve(cwd, 'package.json'),
    root: resolve(cwd, '.'),
    data: resolve(cwd, dataPath),
    cache: resolve(cwd, join(dataPath, 'cache')),
    uploads: resolve(cwd, join(dataPath, 'uploads')),
    www: resolve(cwd, './www'),
    modules: resolve(cwd, './node_modules'),
  };

  // Ensure paths exist
  mkdirp.sync(paths.uploads);
  mkdirp.sync(paths.www);

  return paths;
};

function componentLookup(tag: string): string | null {
  try { return readFileSync(join(process.env.TEMPLATES_PATH, 'components', `${tag}.html`), 'utf8'); }
  catch { return null; }
}

function helperLookup(_name: string): NeutrinoHelper | null {
  return null;
}

/**
 * This is the main class that powers Vapid projects.
 * It fetches projected environment variables, configuration options,
 * project paths and data storage information. Project runners, like
 * `VapidBuilder` or `VapidServer`, may extend this base class to easily
 * access project configuration and structure data.
 */
export default class Vapid {

  name: string;
  env: 'production' | 'development' | 'test';
  isDev: boolean;
  domain: string;
  prodUrl: string;
  paths: VapidProjectPaths;
  database: Database;
  compiler: TemplateCompiler;
  config: VapidSettings = {
    cache: process.env.NODE_ENV === 'production',
    database: {
      dialect: 'sqlite',
      logging: false,
    },
    dataPath: './data',
    liveReload: process.env.NODE_ENV !== 'production',
    placeholders: process.env.NODE_ENV !== 'production',
    port: parseInt(process.env.PORT, 10) || 3000,
  }

  /**
   * This module works in conjunction with a site directory.
   */
  constructor(cwd: string) {
    // TODO: Ensure package.json is present.
    const pjson = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf-8'));
    const options = pjson.vapid as Partial<VapidPublicSettings>;
    dotenv.config({ path: resolve(cwd, '.env') });

    this.config = Object.assign({}, this.config, options);
    this.name = options.name || pjson.name;
    this.env = process.env.NODE_ENV || 'development';
    this.isDev = (this.env === 'development' || this.env === 'test');
    this.domain = this.isDev ? `localhost:${this.config.port}` : (options.domain || pjson.homepage);
    this.prodUrl = options.domain || pjson.homepage;
    this.paths = getProjectPaths(cwd, this.config.dataPath);

    // TODO: Switch out database provider based on config.
    this.database = new Database(new MemoryProvider({}));
    this.compiler = new TemplateCompiler(componentLookup, helperLookup);
  }
}
