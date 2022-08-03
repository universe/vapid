import { IMedia, IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, Record, stampRecord, Template } from '@neutrino/core';
import FirebaseProvider from '@neutrino/datastore/dist/src/providers/FireBaseProvider.js';
import type { IWebsite } from '@neutrino/runtime';
import type { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';

import { DataAdapter, SortableUpdate } from "./types";

function sortRecords(a: IRecord, b: IRecord) {
  const ap = a.order ?? Infinity;
  const bp = b.order ?? Infinity;
  if (ap === bp) { a.createdAt > b.createdAt ? 1 : -1; }
  return ap > bp ? 1 : -1;
}

export default class APIAdapter extends DataAdapter {
  private provider: FirebaseProvider;

  constructor(projectId: string, app?: FirebaseApp | null) {
    super();
    this.provider = new FirebaseProvider({
      name: 'Neutrino',
      domain: 'demo.universe.app',
      database: {
        type: 'firebase',
        scope: 'websites/default',
        projectId,
        app,
      },
    });
  }

  async init(): Promise<void> {
    await this.provider.start();
  }

  currentUser(): User | null {
    return this.provider.currentUser();
  }

  async signIn(username: string, password?: string): Promise<User | null> {
    return this.provider.signIn(username, password);
  }

  private async saveRecord(type: 'DELETE' | 'POST', body: IRecord) {
    const db = this.provider;
    const id = (typeof body.id === 'string' ? body.id : null);
    const parentId = (typeof body.parentId === 'string' ? body.parentId : null);
    if (!id) { throw new Error('Record ID is required.'); }

    const isDelete = type === 'DELETE';
    let record = await db.getRecordById(id);
    let template = record?.templateId ? await db.getTemplateById(record?.templateId) : null;

    try {
      if (!record) {
        const templateId = (typeof body.templateId === 'string' ? body.templateId : null);
        if (!templateId) { throw new Error('Template ID is required for new records.'); }
        template = await db.getTemplateById(templateId);
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
      record.id = (typeof body.id === 'string' ? body.id : null)  || record.id;
      record.parentId = (typeof body.parentId === 'string' ? body.parentId : null)  || record.parentId;
      record.name = (typeof body.name === 'string' ? body.name : null)  || record.name;
      record.slug = (typeof body.slug === 'string' ? body.slug : null) || record.slug;
      record.createdAt = (typeof body.createdAt === 'number' ? body.createdAt : null) || record.createdAt;
      record.updatedAt = (typeof body.updatedAt === 'number' ? body.updatedAt : null) || record.updatedAt;

      // Ensure our slug doesn't contain additional slashes.
      if (record.slug) { record.slug = `${record.slug || ''}`.replace(/^\/+/, ''); }
      console.info(JSON.stringify(record, null, 2));
      console.info(`${isDelete ? 'Deleting' : 'Saving'} ${record.id}: ${Record.permalink(record)}`);
      await isDelete ? db.deleteRecord(record.id) : db.updateRecord(record);
      return record;
    }
    catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  }

  async getSiteData(): Promise<IWebsite> {
    const data: IWebsite = await (await fetch(`http://localhost:1776/api/data`, {
      method: 'GET',
      headers: {
        'x-csrf-token': 'wat',
        'Content-Type': 'application/json',
      },
    })).json();
    // const data: IWebsite = await (await fetch(`https://demo.universe.app/website/site.json`)).json();
    const templates: ITemplate[] = await this.provider.getAllTemplates();
    const records: IRecord[] = await this.provider.getAllRecords();
    const siteData: IWebsite = {
      meta: data.meta,
      records: {},
      hbs: {
        pages: {},
        templates: {},
        components: {},
        stylesheets: {},
      },
    };

    for (const record of records) {
      siteData.records[record.id] = record;
    }

    siteData.hbs = data.hbs;
    // const tree = await this.compiler.parse(this.paths.www);
    for (const template of templates) {
      siteData.hbs.templates[Template.id(template)] = template;
      // const parsed = tree[id];
      // if (!parsed) { continue; }
      // siteData.hbs.pages[id] = { name: parsed.name, type: parsed.type, ast: parsed.ast };
      // siteData.hbs.components = { ...siteData.hbs.components, ...parsed.components };
      // siteData.hbs.stylesheets = { ...siteData.hbs.stylesheets, ...parsed.stylesheets };
    }

    return siteData;
  }

  async updateRecord(record: IRecord): Promise<IRecord> {
    return await this.saveRecord('POST', record);
  }

  async updateOrder(update: SortableUpdate): Promise<void> {
    const db = this.provider;
    try {
      const foundRecord = await db.getRecordById(update.id);
      if (!foundRecord) { throw new Error('Record not found.'); }

      const records = update.parentId ? (await db.getChildren(update.parentId)).sort(sortRecords) : [];
      const newRecords: IRecord[] = [];

      for (let i=0; i < records.length; i++) {
        if (records[i].id === update.id) { continue; }
        newRecords.push(records[i]);
      }
      foundRecord.parentId = update.parentId;
      foundRecord && newRecords.splice(update.to, 0, foundRecord);

      for (let i=0; i < newRecords.length; i++) {
        const record = newRecords[i];
        record.order = i;
        await db.updateRecord(record);
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
}
