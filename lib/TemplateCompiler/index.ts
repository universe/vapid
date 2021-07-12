
import { readFileSync, existsSync } from 'fs';
import { basename, dirname, join } from 'path';

import { PageType, IRecord, ITemplate, Record as DBRecord, Template } from '../Database/models';
import { IProvider } from '../Database/providers';
import { helper } from '../directives';
import {
  NeutrinoHelper,
  CollectionHelper,
  IfHelper,
  UnlessHelper,
  CollateHelper,
  EachHelper,
  EqHelper,
  MathHelper,
  LinkHelper,
  ImageHelper,
  DateHelper,
} from './helpers';
import { ComponentResolver, DATA_SYMBOL, GlimmerTemplate, HelperResolver, IParsedTemplate } from './types';
import { render } from './renderer';
import { parse } from './parser';
import Vapid from '../runners/Vapid';

async function makeHelpers(data: IRecord, template: ITemplate, pages: Record<string, any>, provider: IProvider) {
  const { fields } = template;
  const { content } = data;
  const out: object = {};
  const record = new DBRecord(data, new Template(template));
  for (const key of Object.keys(content)) {
    out[key] = await helper(content[key], fields[key] as any, pages);
  }

  out[DATA_SYMBOL] = await record.getMetadata('/', provider);

  return out;
}


/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
 export class TemplateCompiler {

  private helpers: Record<string, NeutrinoHelper> = {};
  private resolveHelper: HelperResolver;
  private resolveComponent: ComponentResolver;

  static get DATA_SYMBOL() { return DATA_SYMBOL; }

  /**
   * @param {object} partials – The partials to make available in this project.
   * @param {array} helpers - Additional helpers to make available in this project.
   */
  constructor(resolveComponent: ComponentResolver = () => null, resolveHelper: HelperResolver = () => null) {
    this.resolveComponent = resolveComponent;
    this.resolveHelper = (name: string) => {
      return this.helpers[name] || resolveHelper(name);
    }

    // Register native helpers
    this.registerHelper('collection', CollectionHelper);
    this.registerHelper('if', IfHelper);
    this.registerHelper('unless', UnlessHelper);
    this.registerHelper('collate', CollateHelper);
    this.registerHelper('each', EachHelper);
    this.registerHelper('eq', EqHelper);
    this.registerHelper('math', MathHelper);
    this.registerHelper('link', LinkHelper);
    this.registerHelper('image', ImageHelper);
    this.registerHelper('date', DateHelper);
  }

  // Wrap all helpers so we unwrap function values and SafeStrings
  registerHelper(name: string, helper: NeutrinoHelper) {
    this.helpers[name] = helper;
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


  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  renderFile(filePath: string, content = {}, data = {}) {
    const { name, type, ast } = this.parseFile(filePath);
    return render(name, type, ast, this.resolveComponent, this.resolveHelper, content, data);
  }

  render(name: string, type: PageType, ast: GlimmerTemplate | string, content = {}, data = {}) {
    return render(name, type, ast, this.resolveComponent, this.resolveHelper, content, data)
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
  async renderContent(vapid: Vapid, uriPath: string) {
    const record = await vapid.database.getRecordFromPath(uriPath.slice(1));

    if (!record) {
      throw new Error('Record not found');
    }

    const template = record.template;
    const templateName = template.name;
    let pagePath = null;
    if (template.type === 'page') {
      const htmlFile = join(vapid.paths.www, `${templateName}.html`);
      const dirFile = join(vapid.paths.www, templateName, 'index.html');
      pagePath = (existsSync(htmlFile) && htmlFile) || (existsSync(dirFile) && dirFile) || null;
    }
    else if (template.type === 'collection') {
      const partial = join(vapid.paths.www, `_${templateName}.html`);
      const collection = join(vapid.paths.www, `collections/${templateName}.html`);
      pagePath = (existsSync(collection) && collection) || (existsSync(partial) && partial) || null;
    }

    if (!pagePath) {
      throw new Error('Template file not found');
    }

    const { name, type, data, ast } = this.parseFile(pagePath);

    // Fetch all renderable pages.
    const pages = await vapid.database.getRecordsByType(PageType.PAGE);

    // Generate our navigation menu.
    const navigation = [];
    for (const page of pages) {
      const meta = await DBRecord.getMetadata(page, uriPath, vapid.database);
      if (!meta.isNavigation) { continue; }
      navigation.push(meta);
    }

    // Create our page context data.
    const pageMeta = await Promise.all(pages.map(p => DBRecord.getMetadata(p, uriPath, vapid.database)));
    const pageData = await makeHelpers(record, template, { pages: pageMeta }, vapid.database);
    const context = { this: {} };
    for (const key of Object.keys(pageData)) {
      context.this[key] = pageData[key];
    }

    /* eslint-disable no-await-in-loop */
    for (const model of Object.values(data)) {
      if (model.type === 'page') { continue; }
      // Fetch all templates where the type and model name match.
      const templates = [await vapid.database.getTemplateByName(model.name, model.type)];
      const records = ((await Promise.all(templates.map(async (t) => {
        if (!t) { return; }
        const records = await vapid.database.getRecordsByTemplateId(t.id);
        return Promise.all(records.map(r => makeHelpers(r, t, { pages: pageMeta }, vapid.database)));
      }))).filter(Boolean) as any).flat() as object[];

      context[model.name] = (model.type === PageType.COLLECTION) ? records : (records[0] || {});
    }

    /* eslint-enable no-await-in-loop */
    return this.render(name, type, ast, context, {
      navigation,
      page: await record.getMetadata(uriPath, vapid.database),
      site: {
        domain: vapid.domain,
        name: vapid.name,
      },
    });
  };


}
