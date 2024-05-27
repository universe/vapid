import { INDEX_PAGE_ID, IProvider, IRecord, ITemplate, IWebsiteMeta, PageType, POJONeutrinoValue, Template, UploadResult } from '@neutrinodev/core';
import { uuid } from '@universe/util';
import * as crypto from 'crypto';
import * as fs from 'fs';
import http from 'http';
import * as path from 'path';
import pino from 'pino';
import serve from 'serve-handler';
import * as tmp from 'tmp';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
let MAX_ID = 1;
const getNextId = () => `${++MAX_ID}`;

export interface MemoryProviderConfig {
  type: 'memory';
  path?: string;
}

interface SerializedMemoryProvider {
  records: Record<string, IRecord>
  templates: Record<string, ITemplate>
}

const DB_NAME = 'data.json';

export default class MemoryProvider extends IProvider<MemoryProviderConfig> {

  private workingDirectory: string = tmp.dirSync().name;
  private records: Record<string, IRecord> = {};
  private templates: Record<string, ITemplate> = {};
  private staticServer: http.Server | null = null;
  private env: Record<string, POJONeutrinoValue> = {};

  async start() {
    logger.info('Starting Memory Provider');
    if (this.config.database.path) {
      this.workingDirectory = this.config.database.path;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.workingDirectory, DB_NAME), 'utf8')) as SerializedMemoryProvider;
        for (const template of Object.values(data.templates)) {
          this.templates[Template.id(template)] = template;
        }
        for (const record of Object.values(data.records)) {
          const template = await this.getTemplateById(record.templateId);
          MAX_ID = Math.max(parseInt(record.id, 10), MAX_ID);
          template && (this.records[record.id] = record);
        }
      }
      catch { 1; }
    }

    const server = this.staticServer || http.createServer((request, response) => serve(request, response, {
      public: this.workingDirectory,
    }));

    server.listen(1991, () => logger.info('Static server running at http://localhost:1991'));
  }

  async stop() {
    logger.info('Stopping Memory Provider');
    this.save();
  }

  private save() {
    const data: SerializedMemoryProvider = {
      templates: this.templates,
      records: this.records,
    };
    fs.writeFileSync(path.join(this.workingDirectory, DB_NAME), JSON.stringify(data, null, 2));
  }

  async purge() {
    this.records = {};
    this.templates = {};
  }

  log(): void {
    logger.info({
      templates: this.templates,
      records: this.records,
    });
  }

  // TODO: Implement.
  async getMetadata(): Promise<IWebsiteMeta> {
    return {
      name: 'Site',
      domain: '',
      media: '',
      theme: { name: '', version: '' },
      env: { ...this.env },
    };
  }

  async getAllTemplates(): Promise<Record<string, ITemplate>> {
    return this.templates;
  }

  async getAllRecords(): Promise<Record<string, IRecord>> {
    return this.records;
  }

  async getTemplateById(id: string): Promise<ITemplate | null> {
    return this.templates[id] || null;
  }

  async getTemplateByName(name: string, type: PageType): Promise<ITemplate | null> {
    for (const template of Object.values(this.templates)) {
      if (template.name === name && template.type === type) {
        return template;
      }
    }
    return null;
  }

  async getTemplatesByType(type: PageType): Promise<ITemplate[]> {
    const res: ITemplate[] = [];
    for (const template of Object.values(this.templates)) {
      if (template && template.type === type) {
        res.push(template);
      }
    }
    return res;
  }

  async getRecordById(id: string): Promise<IRecord | null> {
    const record = this.records[id] || null;
    return record;
  }

  async getRecordBySlug(slug: string, parentId?: string | null): Promise<IRecord | null> {
    slug = slug || INDEX_PAGE_ID;
    for (const record of Object.values(this.records)) {
      if (record.slug === slug && (parentId === undefined || record.parentId === parentId)) {
        return record;
      }
    }
    return null;
  }

  async getRecordsByTemplateId(id: string): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const record of Object.values(this.records)) {
      if (record.templateId === id) {
        res.push(record);
      }
    }
    return res;
  }

  async getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const record of Object.values(this.records)) {
      const template = this.templates[record.templateId];
      if (template && template.type === type && (parentId === undefined || record.parentId === parentId)) {
        res.push(record);
      }
    }
    return res;
  }

  async getChildren(id: string): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const record of Object.values(this.records)) {
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
    this.templates[Template.id(update)] = update;
    this.save();
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
    update.id = old?.id || update.id || getNextId();
    update.updatedAt = Date.now();
    update.createdAt = update.createdAt || Date.now();
    this.records[update.id] = update;
    this.save();
    return update;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    delete this.templates[templateId];
    this.save();
  }

  async deleteRecord(recordId: string): Promise<void> {
    delete this.records[recordId];
    this.save();
  }

  async mediaUrl(name?: string): Promise<string> {
    return `http://localhost:1991/${name}`.replace(/\/$/, '');
  }

  saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  async * saveFile(file: File | string, _type?: string, name?: string): AsyncIterableIterator<UploadResult> {
    yield { status: 'pending', progress: 0 };
    const filename = (file instanceof File ? file.name : name) || uuid();
    const ext = path.extname(filename);
    const savePath = path.join(this.workingDirectory, filename);
    fs.writeFileSync(savePath, file);
    const hash = await new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(savePath);
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
    const hashName = `${hash}${ext}`;
    const imagePath = path.join(this.workingDirectory, hashName);
    fs.renameSync(savePath, imagePath);
    return hashName;
  }
}
