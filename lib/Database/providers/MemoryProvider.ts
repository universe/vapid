import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import * as tmp from 'tmp';
import { pipeline } from 'stream';
import * as util from 'util';
import * as crypto from 'crypto';
import http from 'http';
import serve from 'serve-handler';

import { PageType, ITemplate, IRecord, Template  } from '../models';
import { IProvider } from './types';

const pump = util.promisify(pipeline)
const logger = pino();
let MAX_ID = 1;
const getNextId = () => `${++MAX_ID}`;

export interface MemoryProviderConfig {
  type: 'memory';
  path?: string;
}

interface SerializedMemoryProvider {
  records: IRecord[];
  templates: ITemplate[]
}

export default class MemoryProvider extends IProvider<MemoryProviderConfig> {

  private workingDirectory: string = tmp.dirSync().name;
  private records: Map<string, IRecord> = new Map();
  private templates: Map<string, ITemplate> = new Map();
  private staticServer: http.Server | null = null;

  async start() {
    logger.info('Starting Memory Provider');
    if (this.config.database.path) {
      this.workingDirectory = this.config.database.path;
      try {
        const data = JSON.parse(fs.readFileSync(this.workingDirectory, 'utf8')) as SerializedMemoryProvider;
        for (const template of data.templates) {
          this.templates.set(Template.id(template), template);
        }
        for (const record of data.records) {
          const template = await this.getTemplateById(record.templateId);
          MAX_ID = Math.max(parseInt(record.id), MAX_ID)
          template && this.records.set(record.id, record);
        }
      } catch { }
    }

    const server = this.staticServer || http.createServer((request, response) => serve(request, response, {
      public: this.workingDirectory,
    }));

    server.listen(1991, () => logger.log('Static server running at http://localhost:1991'));
  }

  async stop() {
    logger.info('Stopping Memory Provider');
    this.save();
  }

  private save() {
    const data: SerializedMemoryProvider = {
      templates: [...this.templates.values()],
      records: [...this.records.values()],
    }
    fs.writeFileSync(this.workingDirectory, JSON.stringify(data, null, 2));
  }

  async purge() {
    this.records.clear();
    this.templates.clear();
  }

  log(): void {
    logger.info({
      templates: [...this.templates.values()],
      records: [...this.records.values()],
    });
  }

  async getAllTemplates(): Promise<ITemplate[]> {
    return [...this.templates.values()];
  }

  async getAllRecords(): Promise<IRecord[]> {
    return [...this.records.values()];
  }

  async getTemplateById(id: string): Promise<ITemplate | null> {
    return this.templates.get(id) || null;
  }

  async getTemplateByName(name: string, type: PageType): Promise<ITemplate | null> {
    for (const [_, template] of this.templates) {
      if (template.name === name && template.type === type) {
        return template;
      }
    }
    return null;
  }

  async getTemplatesByType(type: PageType): Promise<ITemplate[]> {
    const res: ITemplate[] = [];
    for (const [_, template] of this.templates) {
      if (template && template.type === type) {
        res.push(template);
      }
    }
    return res;
  }

  async getRecordById(id: string): Promise<IRecord | null> {
    const record = this.records.get(id) || null;
    return record;
  }

  async getRecordBySlug(slug: string, parentId?: string | null): Promise<IRecord | null> {
    for (const [_, record] of this.records) {
      if ((record.slug === slug || (slug === '' && record.slug === 'index')) && (parentId === undefined || record.parentId === parentId)) {
        return record;
      }
    }
    return null;
  }

  async getRecordsByTemplateId(id: string): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const [_, record] of this.records) {
      if (record.templateId === id) {
        res.push(record);
      }
    }
    return res;
  }

  async getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const [_, record] of this.records) {
      const template = this.templates.get(record.templateId);
      if (template && template.type === type && (parentId === undefined || record.parentId === parentId)) {
        res.push(record);
      }
    }
    return res;
  }

  async getChildren(id: string): Promise<IRecord[]> {
    const res: IRecord[] = [];
    for (const [_, record] of this.records) {
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
    this.templates.set(Template.id(update), update);
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
    this.records.set(update.id, update);
    this.save();
    return update;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    this.templates.delete(templateId);
    this.save();
  }

  async deleteRecord(recordId: string): Promise<void> {
    this.records.delete(recordId);
    this.save();
  }

  async mediaUrl(name?: string): Promise<string> {
    return `http://localhost:1991/${name}`.replace(/\/$/, '');
  }

  async saveFile(name: string, file: NodeJS.ReadableStream) {
    this.workingDirectory
    const ext = path.extname(name);
    const savePath = path.join(this.workingDirectory, name);
    await pump(file, fs.createWriteStream(savePath));
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
