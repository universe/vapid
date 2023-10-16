import { 
  IRecord, 
  IRecordData, 
  ITemplate, 
  nanoid,
  NAVIGATION_GROUP_ID, 
  PageType, Record as DBRecord, 
  RECORD_META, 
  SerializedRecord, 
  sortRecords, 
  stampRecord, 
  Template,
} from '@neutrino/core';
import type { SimpleDocument } from '@simple-dom/interface';
import type { Json } from '@universe/util';

import { HelperResolver, resolveHelper as defaultResolveHelper } from './helpers.js';
import { IRenderPageContext, render as rawRender } from './renderer.js';
import { IPageContent, IPageContext, IParsedTemplate, ITemplateAst, IWebsite, RendererComponentResolver, RuntimeHelper } from './types.js';

export * from './helpers.js';
export * from './types.js';

function templateFor(page: IRecord, templates: ITemplate[]): ITemplate | null {
  for (const template of templates) {
    if (page.templateId === Template.id(template)) { return template; }
  }
  console.error(`Missing template for ${page.slug}`);
  return null;
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

function makeRecordData(page: IRecord, template: ITemplate, fieldKey: 'content' | 'metadata', children: IRecord[] = [], parent: IRecord | null = null): IRecordData {
  const out: IRecordData = {
    [RECORD_META]: DBRecord.getMetadata(DBRecord.permalink(page, parent), page, children, parent),
  } as IRecordData;
  for (const key of Object.keys(page[fieldKey])) {
    out[key] = page[fieldKey][key];
  }
  for (const [ key, field ] of Object.entries(template[fieldKey === 'content' ? 'fields' : 'metadata'])) {
    if (Object.hasOwnProperty.call(page[fieldKey], key) || field?.options.default === undefined) { continue; }
    out[key] = field?.options.default;
    if (field.type === 'choice') {
      out[key] = out[key] || '';
      out[key] = String(out[key]).split(',');
    }
  }
  return out;
}

export function makePageContext(isProduction: boolean, page: IRecord, records: Record<string, IRecord>, templates: ITemplate[], site: IWebsite): IPageContext {
  const recordsList = Object.values(records);
  const children = childrenFor(page, recordsList);
  const parent = parentFor(page, recordsList);
  const template = templateFor(page, templates);
  if (!template) { throw new Error(`Missing template for "${page.templateId}"`); }
  const content: IPageContent = { this: makeRecordData(page, template, 'content', children, parent) };
  const collection: Record<string, IRecordData[]> = {};
  const meta = makeRecordData(page, template, 'metadata', children, parent);

  // Generate our navigation menu.
  const navigation: SerializedRecord[] = [];
  const pages: SerializedRecord[] = [];
  const currentUrl = DBRecord.permalink(page, parent);
  for (const page of recordsList.sort(sortRecords)) {
    if (page.deletedAt) { continue; }
    const template = templateFor(page, templates);
    if (!template) { continue; }
    const children = childrenFor(page, recordsList);
    const parent = parentFor(page, recordsList);
    if (template.type === PageType.PAGE) {
      const meta = DBRecord.getMetadata(currentUrl, page, children, parent);
      pages.push(meta);
      if (page.parentId === NAVIGATION_GROUP_ID) { navigation.push(meta); }
    }
    else if (template.type === PageType.COLLECTION) {
      const collectionList: IRecordData[] = collection[template.name] = collection[template.name] || [];
      collectionList.push(makeRecordData(page, template, 'content', children, parent));
    }
    else if (template.type === PageType.SETTINGS) {
      content[template.name] = makeRecordData(page, template, 'content', children, parent);
    }
  }

  // Ensure we create stub settings objects if they don't yet exist in our user generated records.
  for (const template of templates) {
    if (template.type === PageType.SETTINGS && !content[template.name]) {
      content[template.name] = makeRecordData(stampRecord(template), template, 'content', [], null);
    }
  }

  return {
    env: { isProd: isProduction, isDev: !isProduction },
    site: site.meta,
    meta,
    content,
    page: content.this[RECORD_META],
    pages,
    navigation,
    collection,
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
        website: context.site,
      },
    ).data(data?.[key] as unknown as never) : null;
  }
  for (const [ key, field ] of Object.entries(template.fields)) {
    if (!field || Object.hasOwnProperty.call(helperRecord, key)) { continue; }
    const Helper = await defaultResolveHelper(field.type);
    if (!Helper) { continue; }
    const helper = await new Helper(
      key,
      field,
      {
        templateId: null,
        record,
        records: context.pages,
        media: context.site.media,
        website: context.site,
      },
    );
    helperRecord[key] = helperRecord[key] || helper ? await (helper.data as any)() : null;
  }
  return helperRecord;
}

export async function render(
  document: Document | SimpleDocument,
  tmpl: IParsedTemplate,
  data: IPageContext,
  resolveComponent?: RendererComponentResolver,
  resolveHelper: HelperResolver = defaultResolveHelper,
) {
  const context: Record<string, Json | Record<string, RuntimeHelper> | Record<string, RuntimeHelper>[]> = {};
  for (const [ recordName, record ] of Object.entries(data.content)) {
    if (!record) { continue; }
    context[recordName] = Array.isArray(record) ?
      await Promise.all(record.map(rec => makeRenderRecord(rec, tmpl.templates, data))) :
      await makeRenderRecord(record, tmpl.templates, data);
  }

  const renderData: IRenderPageContext = { 
    ...data,
    collection: {},
    props: {},
    component: { id: nanoid() },
  };

  for (const collectionName of Object.keys(data.collection || {})) {
    const list = data.collection[collectionName];
    if (!list) { continue; }
    renderData.collection[collectionName] = await Promise.all(list.map(rec => makeRenderRecord(rec, tmpl.templates, data)));
  }

  resolveComponent = resolveComponent || ((name: string) => tmpl.components[name]?.ast || null);
  return rawRender(document, tmpl, resolveComponent, resolveHelper, renderData, context);
}

export async function renderRecord(
  isProduction: boolean,
  document: Document | SimpleDocument, 
  record: IRecord, 
  siteData: IWebsite,
  records: Record<string, IRecord>,
  resolveComponent?: RendererComponentResolver,
  resolveHelper: HelperResolver = defaultResolveHelper,
) {
  if (!record) { return; }
  const renderedAst = siteData.hbs.pages[record.templateId];
  if (!record || !renderedAst) { return; }
  const renderTemplate: IParsedTemplate | null = {
    name: renderedAst.name,
    type: renderedAst.type,
    ast: renderedAst.ast,
    templates: siteData.hbs.templates,
    components: siteData.hbs.components,
    stylesheets: siteData.hbs.stylesheets,
  };

  const context = makePageContext(isProduction, record, records, Object.values(siteData.hbs.templates), siteData);
  return render(document, renderTemplate, context, resolveComponent, resolveHelper);
}
