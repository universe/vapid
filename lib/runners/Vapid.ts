import * as path from 'path';
import * as mkdirp from 'mkdirp';

import dotenv from 'dotenv';

import Database from '../Database';
// import Generator from '../generator';
import { IProvider, MemoryProvider } from '../Database/providers';

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

/**
 * Resolves commonly-used project paths
 */
export function getProjectPaths(cwd: string, dataPath: string): VapidProjectPaths {
  const paths: VapidProjectPaths = {
    pjson: path.resolve(cwd, 'package.json'),
    root: path.resolve(cwd, '.'),
    data: path.resolve(cwd, dataPath),
    cache: path.resolve(cwd, path.join(dataPath, 'cache')),
    uploads: path.resolve(cwd, path.join(dataPath, 'uploads')),
    www: path.resolve(cwd, './www'),
    modules: path.resolve(cwd, './node_modules'),
  };

  // Ensure paths exist
  mkdirp.sync(paths.uploads);
  mkdirp.sync(paths.www);

  return paths;
};

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
  url: string;
  prodUrl: string;
  paths: VapidProjectPaths;
  provider: IProvider;
  database: Database;
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
    // User-defined options
    /* eslint-disable-next-line import/no-dynamic-require, global-require */
    const { vapid: options = {}, name, homepage } = require(path.resolve(cwd, 'package.json'));

    dotenv.config({ path: path.resolve(cwd, '.env') });

    this.name = options.name || name;
    this.env = process.env.NODE_ENV || 'development';
    this.isDev = (this.env === 'development' || this.env === 'test');
    this.config = Object.assign({}, this.config, options);
    this.url = this.isDev ? `localhost:${this.config.port}` : (options.url || homepage);
    this.prodUrl = options.url || homepage;
    this.paths = getProjectPaths(cwd, this.config.dataPath);

    // Initialize database.
    // const dbConfig = this.config.database;
    // if (dbConfig.dialect === 'sqlite') {
    //   dbConfig.storage = path.resolve(this.paths.data, 'vapid.sqlite');
    // }
    this.provider = new MemoryProvider({});
    console.log('NEW PROVIDER');
    this.database = new Database(this.provider);
  }
}
