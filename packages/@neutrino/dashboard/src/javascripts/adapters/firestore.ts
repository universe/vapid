import { IMedia, IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, stampRecord } from '@neutrino/core';
import FirebaseProvider from '@neutrino/datastore/dist/src/providers/FireBaseProvider.js';
import { IWebsite, renderRecord } from '@neutrino/runtime';
import createDocument from '@simple-dom/document';
import Serializer from '@simple-dom/serializer';
import type { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';

import { DataAdapter, SortableUpdate } from "./types";

function sortRecords(a: IRecord, b: IRecord) {
  const ap = a.order ?? Infinity;
  const bp = b.order ?? Infinity;
  if (ap === bp) { a.createdAt > b.createdAt ? 1 : -1; }
  return ap > bp ? 1 : -1;
}

const WELL_KNOWN_PAGES = {
  index: 'index.html',
  404: '404.html',
};

const DEFAULT_WELL_KNOWN_PAGES: Record<keyof typeof WELL_KNOWN_PAGES, string> = {
  index: '<html><body>Page not Found <a href="/">Take Me Home</a></body></html>',
  404: '<html><body>Page not Found <a href="/">Take Me Home</a></body></html>',
};

export default class APIAdapter extends DataAdapter {
  private provider: FirebaseProvider;
  private domain: string;
  private app: FirebaseApp;

  constructor(app: FirebaseApp, domain: string, scope: string, root = 'uploads') {
    super();
    this.app = app;
    this.domain = domain;
    this.provider = new FirebaseProvider({
      name: 'Neutrino',
      domain,
      database: {
        type: 'firebase',
        firestore: { scope },
        storage: { root },
        projectId: app?.options.projectId,
        app,
      },
    });
  }

  async init(): Promise<void> {
    await this.provider.start();
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
    const siteData = await this.getSiteData();
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

  private siteData: IWebsite | null = null;
  async getSiteData(): Promise<IWebsite> {
    if (this.siteData) { return this.siteData; }
    const data: IWebsite = await (await fetch(import.meta.env.SITE_DATA_URL)).json();

    const meta = await this.provider.getMetadata();
    meta.domain = meta.domain || this.domain;
    meta.media = meta.media || `https://${this.domain}`;
    data.meta = meta;
    console.log('META', meta);
    return this.siteData = data;
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

      const records = update.parentId ? (await db.getChildren(update.parentId)).sort(sortRecords) : await db.getRecordsByType(PageType.PAGE);
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
      const siteData = await this.getSiteData();
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

  async saveFile(id: string, b64Image: string | Blob, type = 'image/png'): Promise<IMedia | null> {
    const blob = typeof b64Image === 'string' ? await fetch(b64Image).then(res => res.blob()) : b64Image;
    const filename = [ id, '.', type.match(/^image\/(\w+)$/i)?.[1] ].join('');
    const data = new Uint8Array(await blob.arrayBuffer());
    const src = await this.provider.saveFile(filename, data);
    if (!src) { throw new Error('Failed to upload file.'); }
    return { file: { src } };
  }

  async deploy(website: IWebsite, records: Record<string, IRecord>) {
    const storage = getStorage(this.app, `gs://${website.meta.domain}`);
    const discoveredDefaults = new Set(Object.keys(WELL_KNOWN_PAGES));

    // For every record that isn't a settings page, render the page and upload.
    for (const record of Object.values(records)) {
      if (record.templateId.endsWith('-settings')) { continue; }
      const document = createDocument();
      const parent: IRecord | null = record.parentId ? records[record.parentId] : null;
      const slug = `${[ parent?.slug, record.slug ].filter(Boolean).join('/')}`;
      discoveredDefaults.delete(slug);
      await renderRecord(true, document, record, website, records);
      const serializer = new Serializer({});
      const html = serializer.serialize(document);
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
