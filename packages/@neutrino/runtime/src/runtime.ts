import { IRecord,  IRecordData, ITemplate, NAVIGATION_GROUP_ID,PageType, Record as DBRecord, RECORD_META, SerializedRecord, sortRecords, Template } from '@neutrino/core';
import type { SimpleDocument } from '@simple-dom/interface';
import type { Json } from '@universe/util';

import { HelperResolver, resolveHelper as defaultResolveHelper } from './helpers.js';
import { render as rawRender } from './renderer.js';
import { IPageContext, IParsedTemplate, ITemplateAst,IWebsite, RendererComponentResolver, RuntimeHelper } from './types.js';

export * from './helpers.js';
export * from './types.js';

function templateFor(page: IRecord, templates: ITemplate[]): ITemplate {
  for (const template of templates) {
    if (page.templateId === Template.id(template)) { return template; }
  }
  throw new Error(`Missing template for ${page.slug}`);
}

function parentFor(page: IRecord, records: IRecord[]): IRecord | null {
  if (!page.parentId || page.parentId === NAVIGATION_GROUP_ID) { return null; }
  for (const record of records) {
    if (page.parentId === record.id) { return record; }
  }
  return null;
}

function childrenFor(page: IRecord, records: IRecord[]): IRecord[] {
  const out: IRecord[] = [];
  for (const record of records) {
    if (record.parentId === page.id) { out.push(record); }
  }
  return out;
}

function makeRecordData(page: IRecord, fieldKey: 'content' | 'metadata', children: IRecord[] = [], parent: IRecord | null = null): IRecordData {
  const out: IRecordData = {
    [RECORD_META]: DBRecord.getMetadata(DBRecord.permalink(page, parent), page, children, parent),
  } as IRecordData;
  for (const key of Object.keys(page[fieldKey])) {
    out[key] = page[fieldKey][key];
  }
  return out;
}

export function makePageContext(page: IRecord, records: IRecord[], templates: ITemplate[], site: IWebsite): IPageContext {
  const children = childrenFor(page, records);
  const parent = parentFor(page, records);
  const content = { this: makeRecordData(page, 'content', children, parent) };
  const meta = makeRecordData(page, 'metadata', children, parent);

  // Generate our navigation menu.
  const navigation: SerializedRecord[] = [];
  const pages: SerializedRecord[] = [];
  const currentUrl = DBRecord.permalink(page);
  for (const page of records.sort(sortRecords)) {
    if (page.deletedAt) { continue; }
    const template = templateFor(page, templates);
    const children = childrenFor(page, records);
    const parent = parentFor(page, records);
    if (template.type === PageType.PAGE) {
      const meta = DBRecord.getMetadata(currentUrl, page, children, parent);
      pages.push(meta);
      if (page.parentId === NAVIGATION_GROUP_ID) { navigation.push(meta); }
    }
    else if (template.type === PageType.COLLECTION) {
      const collection: IRecordData[] = content[template.name] = content[template.name] || [];
      collection.push(makeRecordData(page, 'content', children, parent));
    }
    else if (template.type === PageType.SETTINGS) {
      content[template.name] = makeRecordData(page, 'content', children, parent);
    }
  }

  return {
    site: site.meta,
    meta,
    content,
    page: content.this[RECORD_META],
    pages,
    navigation,
  };
}

export function parsedTemplateToAst(template: IParsedTemplate): ITemplateAst {
  return {
    name: template.name,
    type: template.type,
    ast: template.ast,
  };
}

async function makeRenderRecord(data: IRecordData, templates: Record<string, ITemplate>, context: IPageContext): Promise<Record<string, RuntimeHelper>> {
  const record = data[RECORD_META];
  if (!record) { return {}; }
  const template = templates[`${record.templateId}`];
  const helperRecord: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (key.startsWith('@')) { helperRecord[key] = data[key]; continue; }
    const field = template?.fields?.[key];
    if (!field) { continue; }
    const helper = await defaultResolveHelper(field.type);
    helperRecord[key] = helper ? await new helper(
      key,
      field,
      {
        templateId: null,
        record,
        records: context.pages,
        media: context.site.media,
      },
    ).data(data?.[key] as unknown as never) : null;
  }
  return helperRecord;
}

export async function render(
  document: SimpleDocument,
  tmpl: IParsedTemplate,
  data: IPageContext,
  resolveComponent?: RendererComponentResolver,
  resolveHelper: HelperResolver = defaultResolveHelper,
) {
  const context: Record<string, Json | Record<string, RuntimeHelper> | Record<string, RuntimeHelper>[]> = {};
  for (const [ recordName, record ] of Object.entries(data.content)) {
    if (!record) {
      console.error(recordName, 'IS UNDEFINED');
      continue;
    }
    context[recordName] = Array.isArray(record) ?
      await Promise.all(record.map(rec => makeRenderRecord(rec, tmpl.templates, data))) :
      await makeRenderRecord(record, tmpl.templates, data);
  }

  resolveComponent = resolveComponent || ((name: string) => tmpl.components[name]?.ast || null);
  return rawRender(document, tmpl, resolveComponent, resolveHelper, context, {
    meta: data.meta,
    page: data.page,
    pages: data.pages,
    navigation: data.navigation,
    site: data.site,
  });
}
