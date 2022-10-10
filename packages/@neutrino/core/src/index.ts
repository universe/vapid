import { IRecord, ITemplate, IWebsiteMeta,PageType } from './types.js';

export * from './helpers.js';
export * from './models/index.js';
export * from './types.js';

export interface VapidSettings<T extends { type: string } = { type: string }> {
  name: string;
  domain: string;
  database: T;
  port?: number;
}

export abstract class IProvider<DatabaseConfig extends { type: string } = { type: string }> {
  config: VapidSettings<DatabaseConfig>;
  constructor(config: VapidSettings<DatabaseConfig>) { this.config = config; }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  abstract getMetadata(): Promise<IWebsiteMeta>;
  abstract getAllTemplates(): Promise<ITemplate[]>;
  abstract getAllRecords(): Promise<IRecord[]>;

  abstract getTemplateById(id: string): Promise<ITemplate | null>;
  abstract getTemplateByName(name: string, type: PageType): Promise<ITemplate | null>;
  abstract getTemplatesByType(type: PageType): Promise<ITemplate[]>;

  abstract getRecordById(id: string): Promise<IRecord | null>;
  abstract getRecordBySlug(slug: string, parentId?: string | null): Promise<IRecord | null>;
  abstract getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]>;
  abstract getRecordsByTemplateId(id: string): Promise<IRecord[]>;
  abstract getChildren(id: string): Promise<IRecord[]>;

  abstract updateTemplate(template: ITemplate): Promise<ITemplate>;
  abstract updateRecord(record: IRecord): Promise<IRecord>;

  abstract deleteTemplate(templateId: string): Promise<void>;
  abstract deleteRecord(recordId: string): Promise<void>;

  abstract mediaUrl(name?: string): Promise<string>;
  abstract saveFile(name: string, file: Uint8Array): Promise<string | null>;
}
