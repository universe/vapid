import { IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, stampRecord,UploadResult } from '@neutrinodev/core';
import FirebaseProvider from '@neutrinodev/datastore/dist/src/providers/FireBaseProvider.js';
import { IWebsite, renderRecord } from '@neutrinodev/runtime';
import _createDocument from '@simple-dom/document';
import _Serializer from '@simple-dom/serializer';
import { Deferred } from '@universe/util';
import type { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';

import { DataAdapter, SortableUpdate } from "./types.js";

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

export default class FirebaseAdapter extends DataAdapter {
  private provider: FirebaseProvider;
  private domain: string;
  private app: FirebaseApp;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  constructor(app: FirebaseApp, bucket: string, scope: string, env: Record<string, any> = {}, root = 'uploads') {
    super();
    this.app = app;
    this.domain = bucket;
    this.provider = new FirebaseProvider({
      name: 'Neutrino',
      domain: bucket,
      env,
      database: {
        type: 'firebase',
        firestore: { scope },
        storage: { bucket, root },
        projectId: app?.options.projectId,
        app,
      },
    });
  }

  #initPromise: Deferred | null = null;
  async init(): Promise<void> {
    if (this.#initPromise) { return this.#initPromise; }
    this.#initPromise = new Deferred();
    try {
      await this.provider.start();
      this.#initPromise.resolve();
    }
    catch (err) {
      this.#initPromise.reject(err);
    }
    return this.#initPromise;
  }

  getDomain(): string {
    return this.domain;
  }

  currentUser(): User | null {
    return this.provider.currentUser();
  }

  async signIn(username: string, password?: string): Promise<User | null> {
    return this.provider.signIn(username, password);
  }

  private async getTemplateById(id?: string | null): Promise<ITemplate | null> {
    if (!id) { return null; }
    const siteData = await this.getTheme();
    return siteData.hbs.templates[id] || null;
  }

  private async saveRecord(type: 'DELETE' | 'POST', body: IRecord) {
    const db = this.provider;
    const id = (typeof body.id === 'string' ? body.id : null);
    const parentId = (typeof body.parentId === 'string' ? body.parentId : null);
    if (!id) { throw new Error('Record ID is required.'); }

    const isDelete = type === 'DELETE';
    let record = await db.getRecordById(id);
    let template = record?.templateId ? await this.getTemplateById(record?.templateId) : null;

    try {
      if (!record) {
        const templateId = (typeof body.templateId === 'string' ? body.templateId : null);
        if (!templateId) { throw new Error('Template ID is required for new records.'); }
        template = await this.getTemplateById(templateId);
        if (!template) { throw new Error(`Could not find template "${templateId}".`); }
        if (template.type === PageType.COLLECTION && !parentId) { throw new Error(`Parent record ID is required.`); }
        const parent = parentId ? await db.getRecordById(parentId) : null;
        if (parentId !== NAVIGATION_GROUP_ID && parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
        record = stampRecord(template, { parentId });
      }
      else {
        if (!template) { throw new Error(`Could not find template "${record?.templateId}".`); }
        if (template.type === PageType.COLLECTION && !parentId) { throw new Error(`Parent record ID is required.`); }
        const parent = parentId ? await db.getRecordById(parentId) : null;
        if (parentId !== NAVIGATION_GROUP_ID && parentId && !parent) { throw new Error(`Could not find parent record "${parentId}".`); }
      }

      const metadataFields = new Set(Object.keys(template.metadata));
      const contentFields = new Set(Object.keys(template.fields));

      // Save data
      record.content = Object.assign({}, record.content || {});
      record.metadata = Object.assign({}, record.metadata || {});

      // Only explicitly allowed fields are editable.
      body.content = body.content || {};
      body.metadata = body.metadata || {};
      for (const field of contentFields) { record.content[field] = Object.hasOwnProperty.call(body.content, field) ? body.content?.[field] : record.content[field]; }
      for (const field of metadataFields) { record.metadata[field] = Object.hasOwnProperty.call(body.metadata, field) ? body.metadata?.[field] : record.metadata[field]; }

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
      await isDelete ? db.deleteRecord(record.id) : db.updateRecord(record, template.type);
      return record;
    }
    catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  }

  private hasLocalTheme: boolean | null = null;
  private theme: IWebsite | null = null;
  async getTheme(): Promise<IWebsite> {
    if (this.theme) { return this.theme; }

    const meta = await this.provider.getMetadata();
    const name = meta?.theme?.name || 'neutrino';
    const version = meta?.theme?.version || 'latest';

    let data: IWebsite | null = null;
    // Test if the local theme server has a theme of this name and version.
    if (this.hasLocalTheme === true || this.hasLocalTheme === null) {
      try {
        data = await (await fetch(`http://localhost:1776/api/data/themes/${name}/${name}@${version}.json`)).json();
        this.hasLocalTheme = Object.hasOwnProperty.call(data, 'meta') && Object.hasOwnProperty.call(data, 'hbs');
      }
      catch {
        this.hasLocalTheme = false;
      }
    }

    if (this.hasLocalTheme === false) {
      data = await (await fetch(`${import.meta.env.THEME_URL}/${name}/${name}@${version}.json`)).json();
    }

    if (!data) { throw new Error('Error fetching website theme.'); }

    meta.domain = meta.domain || this.domain;
    meta.media = meta.media || `https://${this.domain}`;
    data.meta = meta;
    return this.theme = data;
  }

  async deployTheme(name: string, version: string): Promise<IWebsite> {
    if (!this.theme) { throw new Error('Missing Theme.'); }
    const blob = new Blob([JSON.stringify(this.theme)], { type: "application/json" });
    const slug = `themes/${name}/${name}@${version}.json`;
    const storage = getStorage(this.app, `gs://${'website.universe.app'}`);
    const fileRef = ref(storage, slug);
    const uploadTask = uploadBytesResumable(fileRef, blob, { contentType: "application/json", cacheControl: 'public,max-age=0' });
    await new Promise<void>((resolve, reject) => uploadTask.on('state_changed', console.log, reject, resolve));
    return this.theme;
  }

  async getAllRecords(): Promise<Record<string, IRecord>> {
    const records = await this.provider.getAllRecords();
    const out: Record<string, IRecord> = {};
    for (const record of records) {
      out[record.id] = record;
    }
    return out;
  }

  async updateRecord(record: IRecord): Promise<IRecord> {
    return await this.saveRecord('POST', record);
  }

  async updateOrder(update: SortableUpdate): Promise<void> {
    const db = this.provider;
    try {
      const foundRecord = await db.getRecordById(update.id);
      if (!foundRecord) { throw new Error('Record not found.'); }

      const records: IRecord[] = update.parentId ? (await db.getChildren(update.parentId)).sort(sortRecords) : await db.getRecordsByType(PageType.PAGE);
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
      const siteData = await this.getTheme();
      const originalOrder = newRecords.map(record => record.order);
      for (let i=0; i < newRecords.length; i++) {
        if (originalOrder[i] === i) { continue; }
        const record = newRecords[i];
        const template = siteData.hbs.templates[record.templateId];
        record.order = i;
        await db.updateRecord(record, template?.type);
      }
    }
    catch {
      alert('Error: could not reorder records');
    }
  }

  async deleteRecord(record: IRecord): Promise<void> {
    await this.saveRecord('DELETE', record);
  }

  saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File | string, type?: string, name?: string): AsyncIterableIterator<UploadResult> { 
    return this.provider.saveFile(file as string, type as string, name as string);
  }

  async deploy(website: IWebsite, records: Record<string, IRecord>) {
    const bucket = this.provider.config?.database?.storage?.bucket || website.meta.domain;
    const storage = getStorage(this.app, `gs://${bucket}`);
    const discoveredDefaults = new Set(Object.keys(WELL_KNOWN_PAGES));

    // Deploy Stylesheets
    for (const stylesheet of Object.values(website.hbs.stylesheets)) {
      const fileRef = ref(storage, stylesheet.path);
      const blob = new Blob([stylesheet.content], { type : 'text/css' });
      const uploadTask = uploadBytesResumable(fileRef, blob, { contentType: 'text/css', cacheControl: 'public,max-age=0' });
      uploadTask.on('state_changed', console.log, console.error, console.log);
    }

    // For every record that isn't a settings page, render the page and upload.
    for (const record of Object.values(records)) {
      if (record.templateId.endsWith('-settings') || record.deletedAt) { continue; }
      const document = createDocument();
      const parent: IRecord | null = record.parentId ? records[record.parentId] : null;
      const slug = `${[ parent?.slug, record.slug ].filter(Boolean).join('/')}`;
      discoveredDefaults.delete(slug);
      const fragment = await renderRecord(true, document, record, website, records);
      const serializer = new Serializer({});
      const html = fragment ? serializer.serialize(fragment) : '';
      const blob = new Blob([html], { type : 'text/html' });
      const fileRef = ref(storage, `${WELL_KNOWN_PAGES[slug] || slug}`);
      const uploadTask = uploadBytesResumable(fileRef, blob, { contentType: 'text/html', cacheControl: 'public,max-age=0' });
      uploadTask.on('state_changed', console.log, console.error, console.log);
    }

    // Upload any default well known pages if the user hasn't provided them for us already.
    for (const slug of discoveredDefaults) {
      const html = DEFAULT_WELL_KNOWN_PAGES[slug];
      if (!html) { continue; }
      const blob = new Blob([html], { type : 'text/html' });
      const fileRef = ref(storage, `${WELL_KNOWN_PAGES[slug] || slug}`);
      const uploadTask = uploadBytesResumable(fileRef, blob, { contentType: 'text/html', cacheControl: 'public,max-age=0' });
      uploadTask.on('state_changed', console.log, console.error, console.log);
    }
  }
}
