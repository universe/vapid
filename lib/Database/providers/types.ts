import { ITemplate, PageType, IRecord  } from '../models';
import type { VapidSettings } from '../../runners/Vapid'; // Import type important here for build

export abstract class IProvider<DatabaseConfig extends { type: string } = { type: string }> {
  config: VapidSettings<DatabaseConfig>;
  constructor(config: VapidSettings<DatabaseConfig>) {
    this.config = config;
  }
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

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
  abstract saveFile(name: string, file: NodeJS.ReadableStream): Promise<string>;
}
