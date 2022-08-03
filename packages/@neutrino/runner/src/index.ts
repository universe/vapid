import { TemplateCompiler } from '@neutrino/compiler';
import { IRecord, IRecordData, NAVIGATION_GROUP_ID, PageType, Record as DBRecord, RECORD_META, SerializedRecord,sortRecords, Template, VapidSettings } from '@neutrino/core';
import Database, { DatabaseConfig, FireBaseProvider, FireBaseProviderConfig, MemoryProvider, MemoryProviderConfig } from '@neutrino/datastore';
import { IPageContext,IParsedTemplate, resolveHelper } from '@neutrino/runtime';
import { Json } from '@universe/util';
import dotenv from 'dotenv';
import { mkdirSync,readFileSync } from 'fs';
import { join,resolve } from 'path';
import * as path from 'path';

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
    database: { type: 'memory', path: path.join(vapid.paths.data, 'data.json') },
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

async function makeRecordData(page: IRecord, fieldKey: 'content' | 'metadata', db: Database): Promise<IRecordData> {
  const children = await db.getChildren(page.id) || null;
  const parent = page.parentId ? await db.getRecordById(page.parentId) : null;
  const out: IRecordData = {
    [RECORD_META]: DBRecord.getMetadata(DBRecord.permalink(page, parent), page, children, parent),
  } as IRecordData;

  for (const key of Object.keys(page[fieldKey])) {
    out[key] = page[fieldKey][key];
  }

  return out;
}

/**
 * This is the main class that powers Vapid projects.
 * It fetches projected environment variables, configuration options,
 * project paths and data storage information. Project runners, like
 * `VapidBuilder` or `VapidServer`, may extend this base class to easily
 * access project configuration and structure data.
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

  private async getPageContext(record: DBRecord, tmpl: IParsedTemplate): Promise<IPageContext> {
    // Fetch all renderable pages.
    const pages = await this.database.getRecordsByType(PageType.PAGE);

    // Generate our navigation menu.
    const navigation: SerializedRecord[] = [];
    const pageMeta: SerializedRecord[] = [];
    const currentUrl = record.permalink();
    for (const page of pages.sort(sortRecords)) {
      const children = await this.database.getChildren(page.id) || null;
      const parent = page.parentId ? await this.database.getRecordById(page.parentId) : null;
      const meta = DBRecord.getMetadata(currentUrl, page, children, parent);
      pageMeta.push(meta);
      if (page.parentId !== NAVIGATION_GROUP_ID) { continue; }
      navigation.push(meta);
    }

    // Create our page context data.
    const content = { this: await makeRecordData(record, 'content', this.database) };

    /* eslint-disable no-await-in-loop */
    for (const model of Object.values(tmpl.templates)) {
      if (model.type === 'page') { continue; }
      // Fetch all templates where the type and model name match.
      const template = await this.database.getTemplateByName(model.name, model.type);
      const records = template ? await this.database.getRecordsByTemplateId(Template.id(template)) : [];

      if (model.type === PageType.COLLECTION) {
        const collection: Json[] = content[model.name] = [];
        for (const record of records) {
          collection.push(await makeRecordData(record, 'content', this.database));
        }
        content[model.name] = collection;
      }
      else {
        // TODO: Create stub record if none exist yet.
        content[model.name] = records[0] ? await makeRecordData(records[0], 'content', this.database) : {};
      }
    }

    return {
      content,
      meta: await makeRecordData(record, 'metadata', this.database),
      page: content.this[RECORD_META],
      pages: pageMeta,
      navigation,
      site: {
        name: this.config.name,
        domain: this.config.domain,
        media: await this.database.mediaUrl(),
      },
    };
  }

  /**
   *
   * Renders content into site template
   *
   * @param {string} uriPath
   * @return {string} rendered HTML
   *
   * @todo Use Promise.all when fetching content
   */
   async renderPermalink(vapid: Vapid, uriPath: string) {
    const record = await vapid.database.getRecordFromPath(uriPath.slice(1));
    const template = record?.template;
    if (!record || !template) { throw new Error('Record not found'); }
    const tree = this.compiler.parse(vapid.paths.www);
    const tmpl = tree[template.id] || null;
    if (!tmpl) { throw new Error(`Template "${template.id}" not found`); }
    const pageData = await this.getPageContext(record, tmpl);
    return await this.compiler.render(tmpl, pageData);
  }
}

export default Vapid;
export type { VapidSettings };