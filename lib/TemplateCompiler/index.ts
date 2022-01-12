
import { readFileSync, existsSync } from 'fs';
import { basename, dirname, join } from 'path';
import { Document } from 'simple-dom';
import Serializer from '@simple-dom/serializer';
import { preprocess } from '@glimmer/syntax';
import { Json } from '@universe/util';
import * as path from 'path';
import * as glob from 'glob';

import { PageType, IRecord, Record as DBRecord, Template, sortRecords, ITemplate, mergeField, stampTemplate } from '../Database/models';
import {
  resolveHelper,
  RECORD_META,
  GlimmerTemplate,
  HelperResolver,
  IParsedTemplate,
  IPageContext,
  IRecordData,
  render,
} from '../TemplateRuntime';
import { parse, ComponentResolver } from './parser';
import { SerializedRecord } from '../Database/types';

import type Vapid from '../runners/Vapid'; // Import type important here for build
import Database from '../Database';

async function makeRecordData(page: IRecord, fieldKey: 'content' | 'metadata', db: Database): Promise<IRecordData> {
  const children = await db.getChildren(page.id) || null;
  const parent = page.parentId ? await db.getRecordById(page.parentId) : null;
  const out: IRecordData = {
    [RECORD_META]: DBRecord.getMetadata(DBRecord.permalink(page, parent), page, children, parent),
  } as IRecordData;
  console.log('RENDER', RECORD_META, JSON.stringify(out, null, 2))
  for (const key of Object.keys(page[fieldKey])) {
    out[key] = page[fieldKey][key];
  }
  return out;
}

/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
 export class TemplateCompiler {
  private resolveHelper: HelperResolver;
  private resolveComponent: ComponentResolver;

  /**
   * @param {object} partials – The partials to make available in this project.
   * @param {array} helpers - Additional helpers to make available in this project.
   */
  constructor(customResolveComponent: ComponentResolver = () => null, customResolveHelper: HelperResolver = () => null) {
    this.resolveComponent = customResolveComponent;
    this.resolveHelper = (name: string) => resolveHelper(name) || customResolveHelper(name);
  }

  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  parseFile(filePath: string): IParsedTemplate {
    const html = readFileSync(filePath, 'utf8');
    const name = basename(filePath, '.html');
    let type: PageType = PageType.PAGE;
    if (dirname(filePath).endsWith('collections')) {
      type = PageType.COLLECTION;
    } else if (dirname(filePath).endsWith('components') || name.startsWith('_')) {
      type = PageType.COMPONENT;
    }
    return parse(name, type, html, this.resolveComponent, this.resolveHelper);
  }

  private resolveComponentAst(name: string): GlimmerTemplate {
    const path = this.resolveComponent(name);
    if (!path) { throw new Error(`Unknown component <${name} />`); }
    return preprocess(path);
  }

  parse(root: string): Record<string, ITemplate> {
    const tree: Record<string, ITemplate> = {};
    const templates = glob.sync(path.resolve(root, '**/*.html'));
    for (const tpl of templates) {
      const parsed = this.parseFile(tpl).templates;

      for (const [parsedName, parsedTemplate] of Object.entries(parsed)) {
        // We merge discovered fields across files, so we gradually collect configurations
        // for all sections here. Get or create this shared object as needed.
        const finalTemplate: ITemplate = tree[parsedName] = tree[parsedName] || stampTemplate({ name: parsedTemplate.name, type: parsedTemplate.type });

        // Ensure the section name and type are set.
        finalTemplate.name = parsedTemplate.name || finalTemplate.name;
        finalTemplate.type = parsedTemplate.type || finalTemplate.type;

        // Merge section options
        Object.assign(finalTemplate.options, parsedTemplate.options);

        // For every content field discovered in the content block, track them in the section.
        for (const field of Object.values(parsedTemplate.fields)) {
          if (!field) { continue; }
          finalTemplate.fields[field.key] = mergeField(finalTemplate.fields[field.key] || {}, field);
        }

        // For every metadata field discovered in the content block, track them in the section.
        for (const field of Object.values(parsedTemplate.metadata)) {
          if (!field) { continue; }
          finalTemplate.metadata[field.key] = mergeField(finalTemplate.metadata[field.key] || {}, field);
        }
      }
    }
    return tree;
  }


  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  async render(tmpl: IParsedTemplate, data: IPageContext) {
    const document = new Document();
    await render(
      document,
      tmpl,
      data,
      this.resolveComponentAst.bind(this),
      this.resolveHelper.bind(this),
    );
    const serializer = new Serializer({});
    return serializer.serialize(document);
  }

  async parseTemplate(vapid: Vapid, type: PageType, name: string) {
    let pagePath: string | null = null;
    if (type === 'page') {
      const htmlFile = join(vapid.paths.www, `${name}.html`);
      const dirFile = join(vapid.paths.www, name, 'index.html');
      pagePath = (existsSync(htmlFile) && htmlFile) || (existsSync(dirFile) && dirFile) || null;
    }
    else if (type === 'collection') {
      const partial = join(vapid.paths.www, `_${name}.html`);
      const collection = join(vapid.paths.www, `collections/${name}.html`);
      pagePath = (existsSync(collection) && collection) || (existsSync(partial) && partial) || null;
    }

    if (!pagePath) {
      console.error(`Template file "${name}-${type}" not found`);
      return null;
    }

    return this.parseFile(pagePath);
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
   async parsePermalink(vapid: Vapid, uriPath: string): Promise<IParsedTemplate | null> {
    const record = await vapid.database.getRecordFromPath(uriPath.slice(1));
    if (!record) { return null; }
    const template = record.template;
    return await this.parseTemplate(vapid, template.type, template.name);
  };

  async getPageContext(vapid: Vapid, record: DBRecord, tmpl: IParsedTemplate): Promise<IPageContext> {
    // Fetch all renderable pages.
    const pages = await vapid.database.getRecordsByType(PageType.PAGE);

    // Generate our navigation menu.
    let navigation: SerializedRecord[] = [];
    const pageMeta: SerializedRecord[] = [];
    const currentUrl = record.permalink();
    for (const page of pages.sort(sortRecords)) {
      const children = await vapid.database.getChildren(page.id) || null;
      const parent = page.parentId ? await vapid.database.getRecordById(page.parentId) : null;
      const meta = DBRecord.getMetadata(currentUrl, page, children, parent);
      pageMeta.push(meta);
      if (page.parentId !== 'navigation') { continue; }
      navigation.push(meta);
    }

    // Create our page context data.
    const content = { this: await makeRecordData(record, 'content', vapid.database) };

    /* eslint-disable no-await-in-loop */
    for (const model of Object.values(tmpl.templates)) {
      if (model.type === 'page') { continue; }
      // Fetch all templates where the type and model name match.
      const template = await vapid.database.getTemplateByName(model.name, model.type);
      const records = template ? await vapid.database.getRecordsByTemplateId(Template.id(template)) : [];

      if (model.type === PageType.COLLECTION) {
        const collection: Json[] = content[model.name] = [];
        for (const record of records) {
          collection.push(await makeRecordData(record, 'content', vapid.database))
        }
        content[model.name] = collection;
      }
      else {
        // TODO: Create stub record if none exist yet.
        content[model.name] = records[0] ? await makeRecordData(records[0], 'content', vapid.database) : {};
      }
    }

    return {
      content,
      meta: await makeRecordData(record, 'metadata', vapid.database),
      page: content.this[RECORD_META],
      pages: pageMeta,
      navigation,
      media: {
        host: await vapid.database.mediaUrl(),
      },
      site: {
        domain: vapid.config.domain,
        name: vapid.config.name,
      },
    }
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
    const tmpl = await this.parsePermalink(vapid, uriPath);
    if (!tmpl) { throw new Error('Permalink not found'); }
    const record = await vapid.database.getRecordFromPath(uriPath.slice(1));
    const template = record?.template;
    if (!record || !template) { throw new Error('Record not found'); }
    const pageData = await this.getPageContext(vapid, record, tmpl);
    return await this.render(tmpl, pageData);
  };
}
