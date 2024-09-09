import { FileHeaders, IProvider, IRecord, ITemplate, IWebsite, mergeAnchor, NAVIGATION_GROUP_ID, PageType, stampRecord, UploadResult } from '@neutrinodev/core';
import FirebaseProvider from '@neutrinodev/datastore/dist/src/providers/FireBaseProvider.js';
import { ITheme, renderRecord } from '@neutrinodev/runtime';
import _createDocument from '@simple-dom/document';
import _Serializer from '@simple-dom/serializer';
import { Deferred } from '@universe/util';
import type { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';

export interface SortableUpdate {
  id: string;
  from: number;
  to: number;
  parentId: string | null;
}

const createDocument = _createDocument as unknown as typeof _createDocument.default;
const Serializer = _Serializer as unknown as typeof _Serializer.default;

function sortRecords(a: IRecord, b: IRecord) {
  const ap = a.order ?? Infinity;
  const bp = b.order ?? Infinity;
  if (ap === bp) { a.createdAt > b.createdAt ? 1 : -1; }
  return ap > bp ? 1 : -1;
}

const WELL_KNOWN_PAGES: Record<string, string> = {
  index: 'index.html',
  404: '404.html',
};

const DEFAULT_WELL_KNOWN_PAGES: Record<keyof typeof WELL_KNOWN_PAGES, string> = {
  index: '<html><body>Page not Found <a href="/">Take Me Home</a></body></html>',
  404: '<html><body>Page not Found <a href="/">Take Me Home</a></body></html>',
};

async function logUpload(iter: AsyncIterableIterator<UploadResult>): Promise<void> {
  for await (const progress of iter) {
    console.log(progress);
  }
}

async function gzipBlob(blob: Blob): Promise<Blob> {
  return new Response(blob.stream().pipeThrough(new CompressionStream("gzip"))).blob();
}

export class DataAdapter extends IProvider {
  private provider: FirebaseProvider;
  private domain: string;
  private app: FirebaseApp;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  constructor(app: FirebaseApp, bucket: string, scope: string, root = 'uploads') {
    super();
    this.app = app;
    this.domain = bucket;
    this.provider = new FirebaseProvider({
      app,
      projectId: app?.options.projectId,
      firestore: { scope },
      storage: { bucket, root },
    });
    this.provider.on('website', () => this.trigger('website'));
    this.provider.on('records', () => this.trigger('records'));
  }

  #initPromise: Deferred | null = null;
  async start(): Promise<void> {
    if (this.#initPromise) { return this.#initPromise; }
    this.#initPromise = new Deferred();
    try {
      await this.provider.start();
      console.info('Started Provider');
    }
    catch (err) {
      this.#initPromise.reject(err);
    }

    // Attempt to bind to a livereload port to get site template updates in dev mode.
    try {
      await await new Promise<ITheme>((resolve, reject) => {
        const ws = new WebSocket(import.meta.env.THEME_DEV_SERVER);
        ws.onopen = () => {
          console.info('Using Local Theme Server');
          document.body.classList.add('neutrino--dev-mode');
        };
        ws.onclose = () => {
          document.body.classList.remove('neutrino--dev-mode');
          reject();
        };
        ws.onmessage = async(evt) => {
          const { command, data } = JSON.parse(evt.data) as { command: string; data: ITheme; };
          console.log(`[WebSocket ${command}]`, data);
          switch (command) {
            case 'update': {
              this.#theme = data;
              this.trigger('theme');
              resolve(this.#theme);
            }
          }
        };
      });
    }
    catch {
      try {
        const site = await this.getWebsite();
        const name = site?.theme?.name || 'neutrino';
        const version = site?.theme?.version || 'latest';
        const theme: ITheme = await (await fetch(`${import.meta.env.THEME_URL}/${name}/${name}@${version}.json?${Math.floor(Math.random() * 100000)}`)).json();
        console.info('Using Production Theme Server');
        if (this.#theme instanceof Deferred) { this.#theme.resolve(theme); }
        this.#theme = theme;
      }
      catch (err) {
        if (this.#theme instanceof Deferred) {
          this.#theme.reject(err);
          this.#initPromise.reject(err);
          return this.#initPromise;
        }
      }
    }

    this.#initPromise.resolve();
    this.trigger('website');
    this.trigger('theme');
    this.trigger('records');
    return this.#initPromise;
  }

  stop() {
    return this.provider.stop();
  }

  private async validateRecord(body: IRecord) {
    const id = (typeof body.id === 'string' ? body.id : null);
    const parentId = (typeof body.parentId === 'string' ? body.parentId : null);
    if (!id) { throw new Error('Record ID is required.'); }

    const theme = await this.getTheme();
    const templates = theme?.templates || {};

    let record = await this.provider.getRecordById(id);
    let template = record?.templateId ? templates[record?.templateId] || null : null;

    try {
      if (!record) {
        const templateId = (typeof body.templateId === 'string' ? body.templateId : null);
        if (!templateId) { throw new Error('Template ID is required for new records.'); }
        template = templates[templateId] || null;
        if (!template) { throw new Error(`Could not find template "${templateId}".`); }
        if (template.type === PageType.COLLECTION && !parentId) { throw new Error(`Parent record ID is required.`); }
        const parent = parentId ? await this.provider.getRecordById(parentId) : null;
        if (parentId !== NAVIGATION_GROUP_ID && parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
        record = stampRecord(template, { parentId });
      }
      else {
        if (!template) { throw new Error(`Could not find template "${record?.templateId}".`); }
        if (template.type === PageType.COLLECTION && !parentId) { throw new Error(`Parent record ID is required.`); }
        const parent = parentId ? await this.provider.getRecordById(parentId) : null;
        if (parentId !== NAVIGATION_GROUP_ID && parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
      }

      const metadataFields = new Set(Object.keys(template.metadata));
      const contentFields = new Set(Object.keys(template.fields));

      // Save data and ensure objects exist.
      record.content = Object.assign({}, record.content || {});
      record.metadata = Object.assign({}, record.metadata || {});
      record.anchors = Object.assign({}, record.anchors || {});

      // Only explicitly allowed fields are editable.
      body.content = body.content || {};
      body.metadata = body.metadata || {};
      for (const field of contentFields) { record.content[field] = Object.hasOwnProperty.call(body.content, field) ? body.content?.[field] : record.content[field]; }
      for (const field of metadataFields) { record.metadata[field] = Object.hasOwnProperty.call(body.metadata, field) ? body.metadata?.[field] : record.metadata[field]; }

      // Ensure the anchors hash has all currently rendered anchors present.
      for (const anchor of Object.values(record?.anchors || {})) { anchor && (anchor.visible = false); }
      for (const [ key, anchor ] of Object.entries(body?.anchors || {})) {
        anchor && (record.anchors[key] = mergeAnchor(record.anchors[key] || {}, anchor));
      }

      // Save all well known page data values.
      record.id = typeof body.id === 'string' ? body.id : record.id;
      record.parentId = typeof body.parentId === 'string' ? body.parentId : record.parentId;
      record.name = typeof body.name === 'string' ? body.name : record.name;
      record.slug = typeof body.slug === 'string' ? body.slug : record.slug;
      record.createdAt = typeof body.createdAt === 'number' ? body.createdAt : record.createdAt;
      record.updatedAt = typeof body.updatedAt === 'number' ? body.updatedAt : record.updatedAt;
      record.order = typeof body.order === 'number' ? body.order : record.order;

      // Ensure our slug doesn't contain additional slashes.
      if (record.slug) { record.slug = `${record.slug || ''}`.replace(/^\/+/, ''); }
      return record;
    }
    catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  }

  // Provider Proxies
  getDomain(): string { return this.domain; }
  currentUser(): User | null { return this.provider.currentUser(); }
  async mediaUrl(): Promise<string> { return this.provider.mediaUrl(); }
  async signIn(username: string, password?: string): Promise<User | null> { return this.provider.signIn(username, password); }
  async getAllRecords(): Promise<Record<string, IRecord>> { return this.provider.getAllRecords(); }
  async getRecordById(recordId?: string | null): Promise<IRecord | null> { return recordId ? this.provider.getRecordById(recordId) : null; }
  async getRecordBySlug(slug: string): Promise<IRecord | null> { return this.provider.getRecordBySlug(slug); }
  async getRecordsByType(type: PageType, parentId?: string): Promise<IRecord[]> { return this.provider.getRecordsByType(type, parentId); }
  async getRecordsByTemplateId(templateId: string): Promise<IRecord[]> { return this.provider.getRecordsByTemplateId(templateId); }
  async getChildren(parentId: string): Promise<IRecord[]> { return this.provider.getChildren(parentId); }
  async getWebsite(): Promise<IWebsite> {
    const meta = await this.provider.getWebsite();
    meta.domain = meta.domain || this.domain;
    meta.media = meta.media || `https://${this.domain}`;
    return meta;
  }

  async updateRecord(record: IRecord): Promise<IRecord> {
    const res = await this.provider.updateRecord(await this.validateRecord(record));
    this.trigger('change');
    return res;
  }

  async deleteRecord(recordId: string | IRecord): Promise<void> {
    if (typeof recordId !== 'string') { recordId = recordId.id; }
    const res = await this.provider.deleteRecord(recordId);
    this.trigger('change');
    return res;
  }

  saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File | string, type?: string, name?: string): AsyncIterableIterator<UploadResult> { 
    return this.provider.saveFile(file as string, type as string, name as string);
  }

  deployFile(filePath: string, blob: Blob, headers: FileHeaders): AsyncIterableIterator<UploadResult> {
    return this.provider.deployFile(filePath, blob, headers);
  }

  // Theme Management
  #theme: ITheme | Deferred<ITheme> = new Deferred<ITheme>();
  async getTheme(): Promise<ITheme> { return this.#theme; }
  async deployTheme(name: string, version: string): Promise<ITheme> {
    if (!this.#theme) { throw new Error('Missing Theme.'); }
    const themeUrl = new URL(import.meta.env.THEME_URL);
    const slug = [ themeUrl.pathname.slice(1).trim(), `${name}/${name}@${version}.json` ].filter(Boolean).join('/');
    const storage = getStorage(this.app, `gs://${themeUrl.hostname}`);
    const fileRef = ref(storage, slug);
    const blob = await gzipBlob(new Blob([JSON.stringify(this.#theme)], { type: "application/json" }));
    const uploadTask = uploadBytesResumable(fileRef, blob, {
      contentType: "application/json",
      cacheControl: 'public,max-age=0',
      contentEncoding: 'gzip',
      customMetadata: {
        realm: this.domain.replace('.campaign.win', '.universe.app'),
      },
    });
    await new Promise<void>((resolve, reject) => uploadTask.on('state_changed', console.log, reject, resolve));
    return structuredClone(await this.#theme);
  }

  async getAllTemplates(): Promise<Record<string, ITemplate>> {
    const theme = await this.#theme;
    return structuredClone(theme.templates);
  }

  async getTemplateById(id: string): Promise<ITemplate | null> {
    if (!id) { return null; }
    const data = await this.#theme;
    return data?.templates?.[id] || null;
  }

  async getTemplateByName(name: string, type: PageType): Promise<ITemplate | null> {
    const theme = await this.#theme;
    for (const template of Object.values(theme?.templates || {})) {
      if (template.name === name && template.type === type) {
        return template;
      }
    }
    return null;
  }

  async getTemplatesByType(type: PageType): Promise<ITemplate[]> {
    const theme = await this.#theme;
    return Object.values(theme?.templates || {}).filter(t => t?.type === type);
  }

  async updateOrder(update: SortableUpdate): Promise<void> {
    try {
      const foundRecord = await this.provider.getRecordById(update.id);
      if (!foundRecord) { throw new Error('Record not found.'); }

      const records: IRecord[] = update.parentId ? (await this.provider.getChildren(update.parentId)).sort(sortRecords) : await this.provider.getRecordsByType(PageType.PAGE);
      const newRecords: IRecord[] = records
        .filter(record => (record.id !== update.id && !record.deletedAt))
        .sort((a, b) => {
          if ((a.parentId === NAVIGATION_GROUP_ID || b.parentId === NAVIGATION_GROUP_ID) && a.parentId !== b.parentId) {
            return a.parentId === NAVIGATION_GROUP_ID ? -1 : 1;
          }
          return (a.order ?? Infinity) < (b.order ?? Infinity) ? -1 : 1;
        });
      foundRecord.parentId = update.parentId;
      foundRecord && newRecords.splice(update.to, 0, foundRecord);
      const originalOrder = newRecords.map(record => record.order);
      for (let i=0; i < newRecords.length; i++) {
        if (originalOrder[i] === i) { continue; }
        const record = newRecords[i];
        record.order = i;
        await this.provider.updateRecord(record);
      }
      this.trigger('change');
    }
    catch {
      alert('Error: could not reorder records');
    }
  }

  async deploy(record?: IRecord) {
    const website = await this.getWebsite();
    const theme = await this.getTheme();
    const allRecords = await this.getAllRecords();
    const discoveredDefaults = new Set(Object.keys(WELL_KNOWN_PAGES));
    const promises: Promise<void>[] = [];
    // Deploy Stylesheets First
    for (const stylesheet of Object.values(theme.stylesheets)) {
      const blob = await gzipBlob(new Blob([stylesheet.content], { type : 'text/css' }));
      promises.push(logUpload(this.provider.deployFile(stylesheet.path, blob, { contentType: 'text/css', cacheControl: 'public,max-age=0', contentEncoding: 'gzip' })));
    }

    // For every record that isn't a settings page, render the page and upload.
    const toUpload = record ? [record] : Object.values(allRecords);
    for (const record of toUpload) {
      if (record.templateId.endsWith('-settings') || record.deletedAt) { continue; }
      const document = createDocument();
      const serializer = new Serializer({});
      const parent: IRecord | null = record.parentId ? allRecords[record.parentId] : null;
      const slug = `${[ parent?.slug, record.slug ].filter(Boolean).join('/')}`;
      discoveredDefaults.delete(slug);
      const result = await renderRecord(true, document, record, website, theme, allRecords);
      const html = result?.document ? serializer.serialize(result.document) : '';
      const blob = await gzipBlob(new Blob([html], { type : 'text/html' }));
      promises.push(
        logUpload(this.provider.deployFile(`${WELL_KNOWN_PAGES[slug] || slug}`, blob, { contentType: 'text/html', cacheControl: 'public,max-age=0', contentEncoding: 'gzip' })),
      );
    }

    // Upload any default well known pages if the user hasn't provided them for us already.
    if (!record) {
      for (const slug of discoveredDefaults) {
        const html = DEFAULT_WELL_KNOWN_PAGES[slug];
        if (!html) { continue; }
        const blob = await gzipBlob((new Blob([html], { type : 'text/html' })));
        promises.push(
          logUpload(this.provider.deployFile(`${WELL_KNOWN_PAGES[slug] || slug}`, blob, { contentType: 'text/html', cacheControl: 'public,max-age=0', contentEncoding: 'gzip' })),
        );
      }
    }

    await Promise.allSettled(promises);
  }
}
