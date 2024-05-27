import { INDEX_PAGE_ID, IProvider, IRecord, ITemplate, IWebsiteMeta, PageType, Record as RecordModel, Template, UploadResult } from '@neutrinodev/core';

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

export * from './providers/index.js';
export type { IProvider, IRecord, ITemplate } from '@neutrinodev/core';
export { PageType, Record, Template } from '@neutrinodev/core';

/**
 * Helps keep the database data structure in sync with the site templates
 */
export default class Database<T extends { type: string; } = { type: string; }> extends IProvider<T> {
  private provider: IProvider<T>;

  constructor(provider: IProvider<T>) {
    super(provider.config);
    this.provider = provider;
  }

  getMetadata(): Promise<IWebsiteMeta> { return this.provider.getMetadata(); }
  getAllTemplates(): Promise<Record<string, ITemplate>> { return this.provider.getAllTemplates(); }
  getAllRecords(): Promise<Record<string, IRecord>> { return this.provider.getAllRecords(); }
  getTemplateById(id: string): Promise<ITemplate | null> { return this.provider.getTemplateById(id); }
  getTemplateByName(name: string, type: PageType): Promise<ITemplate | null> { return this.provider.getTemplateByName(name, type); }
  getTemplatesByType(type: PageType): Promise<ITemplate[]> { return this.provider.getTemplatesByType(type); }
  getRecordById(id: string): Promise<IRecord | null> { return this.provider.getRecordById(id); }
  getRecordBySlug(slug: string, parentId?: string | null): Promise<IRecord | null> { return this.provider.getRecordBySlug(slug, parentId); }
  getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]> { return this.provider.getRecordsByType(type, parentId); }
  getRecordsByTemplateId(id: string): Promise<IRecord[]> { return this.provider.getRecordsByTemplateId(id); }
  getChildren(id: string): Promise<IRecord[]> { return this.provider.getChildren(id); }
  updateTemplate(template: ITemplate): Promise<ITemplate> { return this.provider.updateTemplate(template); }
  updateRecord(record: IRecord): Promise<IRecord> { return this.provider.updateRecord(record); }
  deleteTemplate(templateId: string): Promise<void> { return this.provider.deleteTemplate(templateId); }
  deleteRecord(recordId: string): Promise<void> { return this.provider.deleteRecord(recordId); }
  mediaUrl(name?: string): Promise<string> { return this.provider.mediaUrl(name); }

  saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  /* eslint-disable-next-line require-yield */
  async * saveFile(_file: File | string, _type?: string, _name?: string): AsyncIterableIterator<UploadResult> {
    return { status: 'error', message: 'No file handler provided.' };
  }

  async start() {
    await this.provider.start();

    const generalTemplate = await this.provider.getTemplateById('general') || await this.provider.updateTemplate({
      sortable: false,
      type: PageType.SETTINGS,
      name: 'general',
      options: {},
      fields: {},
      metadata: {},
    });

    await this.provider.getRecordById('general') || await this.provider.updateRecord({
      id: 'general',
      templateId: Template.id(generalTemplate),
      parentId: null,
      name: null,
      slug: 'general',
      content: {},
      metadata: {},
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    });

    const indexTemplate = await this.provider.getTemplateById(INDEX_PAGE_ID) || await this.provider.updateTemplate({
      sortable: false,
      type: PageType.PAGE,
      name: INDEX_PAGE_ID,
      options: {},
      fields: {},
      metadata: {},
    });

    await this.provider.getRecordById(INDEX_PAGE_ID) || await this.provider.updateRecord({
      id: INDEX_PAGE_ID,
      templateId: Template.id(indexTemplate),
      parentId: null,
      name: null,
      slug: INDEX_PAGE_ID,
      content: {},
      metadata: {},
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    });

  }
  async stop() { await this.provider.stop(); }

  async hydrateRecord(record: IRecord): Promise<RecordModel> {
    const template = await this.provider.getTemplateById(record.templateId);
    if (!template) { throw new Error('No template found for record.'); }
    const parent = record.parentId ? await this.provider.getRecordById(record.parentId) : null;
    return new RecordModel(record, new Template(template), parent ? await this.hydrateRecord(parent) : null);
  }

  async getIndex(): Promise<RecordModel | null> {
    const template = await this.getTemplateByName(INDEX_PAGE_ID, PageType.PAGE);
    if (!template) { return null; }
    const record = (await this.getRecordsByTemplateId(Template.id(template)))[0] || null;
    return record ? this.hydrateRecord(record) : null;
  }

  async getGeneral(): Promise<RecordModel | null> {
    const template = await this.getTemplateByName('general', PageType.SETTINGS);
    if (!template) { return null; }
    const record = (await this.getRecordsByTemplateId(Template.id(template)))[0] || null;
    return record ? this.hydrateRecord(record) : null;
  }

  async getRecordFromPath(permalink: string): Promise<RecordModel | null> {

    // Alias root requests.
    if (permalink.endsWith('/')) { permalink = permalink.slice(0, -1); }
    if (permalink === '' || permalink === '/') { permalink = INDEX_PAGE_ID; }

    // If we have an exact match, opt for that.
    let record = await this.provider.getRecordBySlug(permalink);
    let tmpl = record ? await this.provider.getTemplateById(record.templateId) : null;
    if (record && tmpl) { return this.hydrateRecord(record); }

    // If a slug doesn't match perfectly, then any slashes in the name might come from a
    // collection specifier. Parse this like a collection record.
    if (permalink.includes('/')) {
      const segments = permalink.split('/');
      const pageSlug = segments.shift();
      const collectionSlug = segments.join('/');
      const page = (pageSlug ? await this.provider.getRecordBySlug(pageSlug) : null) || null;

      // Try to get the plain old slug value if it exists.
      record = await this.provider.getRecordBySlug(collectionSlug, page?.id || null);
      if (record) {
        const res = await this.hydrateRecord(record);
        return (!page && res.template.name !== pageSlug) ? null : res;
      }

      // Otherwise, this must be a {template_name}-{record_id} slug. Grab the ID.
      const id = collectionSlug.split('-').pop() || '';
      record = id ? await this.provider.getRecordById(id) : null;
    }

    // Otherwise, this is a {template_name}--{record_id} slug for a page. Grab the ID.
    const parts = permalink.split('--');
    const id = parts.length > 1 ? parts.pop() : null;
    record = id ? await this.provider.getRecordById(id) : null;
    tmpl = record ? await this.provider.getTemplateById(record.templateId) : null;
    return (record && tmpl) ? this.hydrateRecord(record) : null;
  }
}
