import * as fs from 'fs';

import { Collection, PageType, ITemplate, Template, IRecord, Record as DBRecord  } from '../models';
import { IProvider } from './types';

let AUTO_INCREMENT = 2;
function getNextId() {
  return AUTO_INCREMENT++;
}

export interface MemoryProviderConfig {
  path?: string;
}

interface SerializedMemoryProvider {
  records: IRecord[];
  templates: ITemplate[]
}

export default class MemoryProvider extends IProvider<MemoryProviderConfig> {

  #records: Map<number, DBRecord> = new Map();
  #templates: Map<number, Template> = new Map();

  async start() {
    console.info('Starting Memory Provider');
    if (this.config.path) {
      try {
        const data = JSON.parse(fs.readFileSync(this.config.path, 'utf8')) as SerializedMemoryProvider;
        for (const template of data.templates) {
          this.#templates.set(template.id || getNextId(), new Template(template));
        }
        for (const record of data.records) {
          const template = await this.getTemplateById(record.templateId);
          template && this.#records.set(record.id, new DBRecord(record, template));
        }
      } catch { }
    }

    await this.updateTemplate({
      id: 1,
      sortable: false,
      type: PageType.PAGE,
      name: 'index',
      options: {},
      fields: {},
    });
    await this.updateRecord({
      id: 1,
      content: {},
      metadata: {},
      templateId: 1,
      position: 0,
      slug: 'index',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

  }

  async stop() {
    console.info('Stopping Memory Provider');
    if (this.config.path) {
      const data: SerializedMemoryProvider = {
        templates: [...this.#templates.values()],
        records: [...this.#records.values()],
      }
      fs.writeFileSync(this.config.path, JSON.stringify(data, null, 2));
    }
  }

  async getAllTemplates(): Promise<Template[]> {
    return [...this.#templates.values()];
  }

  async getAllRecords(): Promise<DBRecord[]> {
    return [...this.#records.values()];
  }

  async getTemplateById(id: number): Promise<Template | null> {
    return this.#templates.get(id) || null;
  }

  async getTemplateByName(name: string, type: PageType): Promise<Template | null> {
    for (const [_, template] of this.#templates) {
      console.log(template, name, type, template.name === name && template.type === type);
      if (template.name === name && template.type === type) {
        console.log('returning')
        return template;
      }
    }
    return null;
  }

  async getTemplatesByType(type: PageType): Promise<Template[]> {
    const res: Template[] = [];
    for (const [_, template] of this.#templates) {
      if (template && template.type === type) {
        res.push(template);
      }
    }
    return res;
  }

  async getRecordById(id: number): Promise<DBRecord | null> {
    const record = this.#records.get(id) || null;
    return record;
  }

  async getRecordBySlug(slug: string): Promise<DBRecord | null> {
    console.log('FIND', slug, this.#records.size, this.#records);
    for (const [_, record] of this.#records) {
      console.log(slug, record, record.slug === slug);
      if (record.slug === slug) {
        return record;
      }
    }
    return null;
  }


  async getRecordsByTemplateId(id: number): Promise<DBRecord[]> {
    const res: DBRecord[] = [];
    for (const [_, record] of this.#records) {
      if (record.templateId === id) {
        res.push(record);
      }
    }
    return res;
  }

  async getRecordsByType(type: PageType): Promise<DBRecord[]> {
    const res: DBRecord[] = [];
    for (const [_, record] of this.#records) {
      const template = this.#templates.get(record.templateId);
      if (template && template.type === type) {
        res.push(record);
      }
    }
    return res;
  }


  /**
   * Update a section's attributes
   * Primarily used by the Vapid module when rebuilding the site
   */
  async updateTemplate(update: ITemplate): Promise<Template> {
    const old = await this.getTemplateByName(update.name, update.type) || null;
    const template = new Template(update);
    template.id = old?.id || update.id || getNextId();
    console.log(template);
    this.#templates.set(template.id, template);
    return template;
  }

  /**
   * Update a section's attributes
   * Primarily used by the Vapid module when rebuilding the site
   */
  async updateRecord(update: IRecord): Promise<DBRecord> {
    const old = await this.getRecordById(update.id) || null;
    const template = await this.getTemplateById(update.templateId);
    console.log(update.templateId, template)
    if (!template) { throw new Error(`Error creating record. Unknown template id ${update.templateId}`); }
    const record = new DBRecord(update, template);
    record.id = old?.id || update.id || getNextId();
    this.#records.set(record.id, record);
    return record;
  }

  async getCollectionByName(name: string): Promise<Collection | null> {
    const template = await this.getTemplateByName(name, PageType.COLLECTION);
    return template ? {
      template: template,
      records: await this.getRecordsByTemplateId(template.id),
    } : null;
  }
}
