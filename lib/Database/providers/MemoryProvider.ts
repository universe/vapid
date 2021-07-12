import * as fs from 'fs';
import pino from 'pino';

import { PageType, ITemplate, IRecord  } from '../models';
import { IProvider } from './types';

const logger = pino();
let AUTO_INCREMENT = 2;
const getNextId = () => AUTO_INCREMENT++;

export interface MemoryProviderConfig {
  path?: string;
}

interface SerializedMemoryProvider {
  records: IRecord[];
  templates: ITemplate[]
}

export default class MemoryProvider extends IProvider<MemoryProviderConfig> {

  #records: Map<number, IRecord> = new Map();
  #templates: Map<number, ITemplate> = new Map();

  async start() {
    logger.info('Starting Memory Provider');
    if (this.config.path) {
      try {
        const data = JSON.parse(fs.readFileSync(this.config.path, 'utf8')) as SerializedMemoryProvider;
        for (const template of data.templates) {
          this.#templates.set(template.id || getNextId(), template);
        }
        for (const record of data.records) {
          const template = await this.getTemplateById(record.templateId);
          template && this.#records.set(record.id, record);
        }
      } catch { }
    }
  }

  async stop() {
    logger.info('Stopping Memory Provider');
    if (this.config.path) {
      const data: SerializedMemoryProvider = {
        templates: [...this.#templates.values()],
        records: [...this.#records.values()],
      }
      fs.writeFileSync(this.config.path, JSON.stringify(data, null, 2));
    }
  }

  async purge() {
    this.#records.clear();
    this.#templates.clear();
  }

  log(): void {
    logger.log({
      templates: [...this.#templates.values()],
      records: [...this.#records.values()],
    });
  }

  async getAllTemplates(): Promise<ITemplate[]> {
    return [...this.#templates.values()];
  }

  async getAllRecords(): Promise<IRecord[]> {
    return [...this.#records.values()];
  }

  async getTemplateById(id: number): Promise<ITemplate | null> {
    return this.#templates.get(id) || null;
  }

  async getTemplateByName(name: string, type: PageType): Promise<ITemplate | null> {
    for (const [_, template] of this.#templates) {
      if (template.name === name && template.type === type) {
        return template;
      }
    }
    return null;
  }

  async getTemplatesByType(type: PageType): Promise<ITemplate[]> {
    const res: ITemplate[] = [];
    for (const [_, template] of this.#templates) {
      if (template && template.type === type) {
        res.push(template);
      }
    }
    return res;
  }

  async getRecordById(id: number): Promise<IRecord | null> {
    const record = this.#records.get(id) || null;
    return record;
  }

  async getRecordBySlug(slug: string): Promise<IRecord | null> {
    for (const [_, record] of this.#records) {
      if (record.slug === slug || (slug === '' && record.slug === 'index')) {
        return record;
      }
    }
    return null;
  }

  async getRecordsByTemplateId(id: number): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const [_, record] of this.#records) {
      if (record.templateId === id) {
        res.push(record);
      }
    }
    return res;
  }

  async getRecordsByType(type: PageType): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const [_, record] of this.#records) {
      const template = this.#templates.get(record.templateId);
      if (template && template.type === type) {
        res.push(record);
      }
    }
    return res;
  }

  async getChildren(id: number): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const [_, record] of this.#records) {
      if (record && record.parentId === id) {
        res.push(record);
      }
    }
    return res;
  }

  /**
   * Update a section's attributes
   * Primarily used by the Vapid module when rebuilding the site
   */
  async updateTemplate(update: ITemplate): Promise<ITemplate> {
    const old = await this.getTemplateByName(update.name, update.type) || null;
    if (!isNaN(update.id) && typeof old?.id === 'number' && old.id !== update.id) {
      throw new Error(`A ${update.type} template called ${update.name} already exists.`);
    }
    update.id = +(typeof old?.id !== 'number' ? update.id! : old?.id);
    isNaN(update.id) && (update.id = getNextId());
    this.#templates.set(update.id, update);
    return update;
  }

  /**
   * Update a section's attributes
   * Primarily used by the Vapid module when rebuilding the site
   */
  async updateRecord(update: IRecord): Promise<IRecord> {
    const old = await this.getRecordById(update.id) || null;
    const template = await this.getTemplateById(update.templateId);
    if (!template) {
      try {
        throw new Error(`Error creating record. Unknown template id "${update.templateId}"`);
      }
      catch (err) {
        logger.error(err);
        throw err;
      }
    }
    update.id = +(typeof old?.id !== 'number' ? update.id : old?.id);
    isNaN(update.id) && (update.id = getNextId());
    update.updatedAt = Date.now();
    update.createdAt = update.createdAt || Date.now();
    this.#records.set(update.id, update);
    return update;
  }

  async deleteTemplate(templateId: number): Promise<void> {
    this.#templates.delete(templateId);
  }

  async deleteRecord(recordId: number): Promise<void> {
    this.#records.delete(recordId);
  }
}
