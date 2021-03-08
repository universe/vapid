import * as fs from 'fs';
import {
  join,
  parse,
  relative,
  resolve,
} from 'path';
import { GlobSync } from 'glob';
import Boom from '@hapi/boom';
import Koa from 'koa';

import { TemplateCompiler } from '../TemplateCompiler';
import { Logger, Paths } from '../utils';
import { helper } from '../directives';
import { PageType, Record as DBRecord, Template } from '../Database/models';
import Vapid from '../runners/Vapid';
import { IProvider } from '../Database/providers';

const { views: viewsPath } = Paths.getDashboardPaths();

async function makeHelpers(record: DBRecord, template: Template, pages: Record<string, any>, provider: IProvider) {
  const { fields } = template;
  const { content } = record;
  const out: object = {};
  /* eslint-disable-next-line no-param-reassign */
  record.template = template; // Required for permalink getter
  for (const key of Object.keys(content)) {
    out[key] = helper(content[key], fields[key] as any, pages);
  }

  out[TemplateCompiler.DATA_SYMBOL] = await record.getMetadata('/', provider);

  return out;
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
export async function renderContent(this: Vapid, uriPath: string) {
  const record = await Paths.getRecordFromPath(uriPath.slice(1), this.provider);

  if (!record) {
    throw Boom.notFound('Record not found');
  }

  const template = record.template;
  const templateName = template.name;
  let pagePath = null;
  if (template.type === 'page') {
    const htmlFile = join(this.paths.www, `${templateName}.html`);
    const dirFile = join(this.paths.www, templateName, 'index.html');
    pagePath = (fs.existsSync(htmlFile) && htmlFile) || (fs.existsSync(dirFile) && dirFile) || null;
  } else if (template.type === 'collection') {
    const partial = join(this.paths.www, `_${templateName}.html`);
    const collection = join(this.paths.www, `collections/${templateName}.html`);
    pagePath = (fs.existsSync(collection) && collection) ||
      (fs.existsSync(partial) && partial) ||
      null;
  }

  if (!pagePath) {
    throw Boom.notFound('Template file not found');
  }

  const partials = {};
  for (const partial of new GlobSync(resolve(this.paths.www, '**/_*.html')).found) {
    const desc = parse(partial);
    const name = join(relative(this.paths.www, desc.dir), desc.name.slice(1));
    partials[name] = fs.readFileSync(partial, 'utf8');
  }

  const compiler = new TemplateCompiler(partials);
  const {
    name,
    type,
    data,
    ast,
  } = compiler.parseFile(pagePath);

  // Fetch all renderable pages.
  const pages = await this.provider.getRecordsByType(PageType.PAGE);

  // Generate our navigation menu.
  const navigation = [];
  for (const page of pages) {
    const meta = await page.getMetadata(uriPath, this.provider);
    if (!meta.isNavigation) { continue; }
    navigation.push(meta);
  }

  // Create our page context data.
  const pageMeta = await Promise.all(pages.map(p => p.getMetadata(uriPath, this.provider)));
  const pageData = await makeHelpers(record, template, { pages: pageMeta }, this.provider);
  const context = {};
  for (const key of Object.keys(pageData)) {
    context[key] = pageData[key];
  }

  /* eslint-disable no-await-in-loop */
  for (const model of Object.values(data)) {
    if (model.type === 'page') { continue; }
    // Fetch all templates where the type and model name match.
    // (await Template.findAll({
    //   order: [['records', 'position', 'ASC']],
    //   where: { type: model.type, name: model.name },
    //   include: [
    //     {
    //       model: Record,
    //       as: 'records',
    //     },
    //   ],
    // })) || [];
    const templates = [await this.provider.getTemplateByName(model.name, model.type)];
    const _records = await Promise.all(templates.map(async (t) => {
      if(!t) { return; }
      const records = await this.provider.getRecordsByTemplateId(t.id);
      return Promise.all(records.map(r => makeHelpers(r, t, { pages: pageMeta }, this.provider)));
    }));

    const records = (_records.filter(Boolean) as any).flat() as object[];

    const firstRecord = records[0] || {};

    context[model.name] = (model.type === PageType.COLLECTION) ? records : firstRecord;
  }

  /* eslint-enable no-await-in-loop */
  return compiler.render(name, type, ast, context, {
    navigation,
    page: await record.getMetadata(uriPath, this.provider),
    site: {
      url: this.url,
      name: this.name,
    },
  });
};

/**
 *
 * Renders error, first by looking in the site directory,
 * then falling back to Vapid own error template.
 *
 * @param {Error} err
 * @param {Object} request
 * @return {[status, rendered]} HTTP status code, and rendered HTML
 */
export function renderError(this: any, err: Error, request: Koa.Request) {
  const error = Boom.boomify(err);
  let status = error.output.statusCode;
  let rendered;
  let errorFile;
  console.log(error)
  if (process.env.NODE_ENV === 'development' && status !== 404) {
    errorFile = resolve(viewsPath, 'errors', 'trace.html');
    rendered = new TemplateCompiler().renderFile(errorFile, {
      error: {
        status,
        title: error.output.payload.error,
        message: error.message,
        stack: error.stack,
      },
      request,
    });
  } else {
    const siteFile = resolve(this.paths.www, '_error.html');
    status = status === 404 ? 404 : 500;
    errorFile = status === 404 && fs.existsSync(siteFile) ? siteFile : resolve(viewsPath, 'errors', `${status}.html`);
    rendered = fs.readFileSync(errorFile, 'utf-8');
  }

  if (status !== 404) {
    Logger.extra(error.stack);
  }

  return [status, rendered];
};
