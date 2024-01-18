import { TemplateCompiler } from '@neutrino/compiler';
import { VapidSettings } from '@neutrino/core';
import Database, { DatabaseConfig, FireBaseProvider, FireBaseProviderConfig, MemoryProvider, MemoryProviderConfig } from '@neutrino/datastore';
import { resolveHelper } from '@neutrino/runtime';
import dotenv from 'dotenv';
import { mkdirSync,readFileSync } from 'fs';
import { join, resolve } from 'path';

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

const DEFAULT_CONFIG = (vapid: Vapid): VapidSettings<MemoryProviderConfig> => {
  return {
    name: 'Vapid',
    port: 3000,
    domain: '',
    database: { type: 'memory', path: join(vapid.paths.data, 'data.json') },
    env: {},
  };
};

interface VapidProjectPaths {
  pjson: string;
  root: string;
  data: string;
  cache: string;
  www: string;
  static: string;
  modules: string;
}

/**
 * This is the main class that powers Vapid projects.
 * It fetches projected environment variables, configuration options,
 * project paths and data storage information. Project runners, like
 * `VapidServer`, may extend this base class to easily access project 
 * configuration and structure data.
 */
export class Vapid {
  env: 'production' | 'development' | 'test' = process.env.NODE_ENV || 'development';
  paths: VapidProjectPaths;
  database: Database;
  compiler: TemplateCompiler;
  config: VapidSettings;

  /**
   * This module works in conjunction with a site directory.
   */
  constructor(cwd: string, config: Partial<VapidSettings>) {
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
    dotenv.config({ path: join(this.paths.www, '.env') });

    // Ensure paths exist
    mkdirSync(this.paths.www, { recursive: true });
    mkdirSync(this.paths.static, { recursive: true });

    // TODO: Ensure package.json is present.
    const pjson = JSON.parse(readFileSync(this.paths.pjson, 'utf-8'));
    const pjsonConfig = (pjson.vapid || {}) as Partial<VapidSettings<DatabaseConfig>>;
    (pjsonConfig.domain || pjson.homepage) && (pjsonConfig.domain =  pjsonConfig.domain || pjson.homepage);
    dotenv.config({ path: resolve(cwd, '.env') });

    // Construct config object.
    this.config = Object.assign(DEFAULT_CONFIG(this), pjsonConfig, config);

    if (!this.config) { throw new Error(`A valid project domain name must be provided.`); }

    // Create the database based on config.
    switch(this.config.database.type) {
      case 'memory': this.database = new Database(new MemoryProvider(this.config as VapidSettings<MemoryProviderConfig>)); break;
      case 'firebase': this.database = new Database(new FireBaseProvider(this.config as VapidSettings<FireBaseProviderConfig>)); break;
      default: throw new Error(`Database provider "${this.config.database.type}" not found.`);
    }

    const componentLookup = (tag: string): string | null => {
      try { return readFileSync(join(this.paths.www, 'components', `${tag}.html`), 'utf8'); }
      catch { return null; }
    };
    this.compiler = new TemplateCompiler(componentLookup, resolveHelper);
  }
}

export default Vapid;

export * from '@neutrino/core';