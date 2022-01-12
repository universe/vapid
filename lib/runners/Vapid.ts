import { resolve, join } from 'path';
import * as fs from 'fs';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import * as path from 'path';

import Database from '../Database';
import { DatabaseConfig, FireBaseProvider, MemoryProvider, FireBaseProviderConfig, MemoryProviderConfig } from '../Database/providers';
import { TemplateCompiler } from '../TemplateCompiler';
import { resolveHelper } from '../TemplateRuntime/helpers';

const DEFAULT_CONFIG = (vapid: Vapid): VapidSettings => {
  return {
    name: 'Vapid',
    port: 3000,
    domain: '',
    database: { type: 'memory', path: path.join(vapid.paths.data, 'data.json') },
  }
}

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      TEMPLATES_PATH: string;
      FIRESTORE_EMULATOR_HOST: string;
      FIREBASE_AUTH_EMULATOR_HOST: string;
      FIREBASE_HOSTING_EMULATOR: string;
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
  static: string;
  modules: string;
}

export interface VapidSettings<T extends { type: string } = DatabaseConfig> {
  name: string;
  domain: string;
  database: T;
  port?: number;
}

/**
 * This is the main class that powers Vapid projects.
 * It fetches projected environment variables, configuration options,
 * project paths and data storage information. Project runners, like
 * `VapidBuilder` or `VapidServer`, may extend this base class to easily
 * access project configuration and structure data.
 */
class Vapid {
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
      uploads: resolve(cwd, join('./data', 'uploads')),
      www: resolve(cwd, './www'),
      static: resolve(cwd, './www/static'),
      modules: resolve(cwd, './node_modules'),
    };

    // Load project .env file if present.
    require('dotenv').config({ path: join(this.paths.www, '.env') })

    // Ensure paths exist
    fs.mkdirSync(this.paths.uploads, { recursive: true });
    fs.mkdirSync(this.paths.www, { recursive: true });
    fs.mkdirSync(this.paths.static, { recursive: true });

    // TODO: Ensure package.json is present.
    const pjson = JSON.parse(readFileSync(this.paths.pjson, 'utf-8'));
    const pjsonConfig = (pjson.vapid || {}) as Partial<VapidSettings>;
    (pjsonConfig.domain || pjson.homepage) && (pjsonConfig.domain =  pjsonConfig.domain || pjson.homepage);
    dotenv.config({ path: resolve(cwd, '.env') });

    // Construct config object.
    this.config = Object.assign(DEFAULT_CONFIG(this), pjsonConfig, config);

    if (!this.config) { throw new Error(`A valid project domain name must be provided.`); }

    // Create the database based on config.
    switch(this.config.database.type) {
      case 'memory': this.database = new Database(new MemoryProvider(this.config as VapidSettings<MemoryProviderConfig>)); break;
      case 'firebase': this.database = new Database(new FireBaseProvider(this.config as VapidSettings<FireBaseProviderConfig>)); break;
    }

    const componentLookup = (tag: string): string | null => {
      try { return readFileSync(join(this.paths.www, 'components', `${tag}.html`), 'utf8'); }
      catch { return null; }
    }
    this.compiler = new TemplateCompiler(componentLookup, resolveHelper);
  }
}

// Parcel has an MJS default export issue with this file... this is what fixes it ¯\_(ツ)_/¯
module.exports = Vapid;
// export default Vapid;
