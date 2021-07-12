import { ITemplate, PageType, IRecord  } from '../models';

export abstract class IProvider<Config = any> {
  config: Config;
  constructor(config: Config) {
    this.config = config;
  }
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  abstract getAllTemplates(): Promise<ITemplate[]>;
  abstract getAllRecords(): Promise<IRecord[]>;

  abstract getTemplateById(id: number): Promise<ITemplate | null>;
  abstract getTemplateByName(name: string, type: PageType): Promise<ITemplate | null>;
  abstract getTemplatesByType(type: PageType): Promise<ITemplate[]>;

  abstract getRecordById(id: number): Promise<IRecord | null>;
  abstract getRecordBySlug(slug: string): Promise<IRecord | null>;
  abstract getRecordsByTemplateId(id: number): Promise<IRecord[]>;
  abstract getRecordsByType(type: PageType): Promise<IRecord[]>;
  abstract getChildren(id: number): Promise<IRecord[]>;

  abstract updateTemplate(template: ITemplate): Promise<ITemplate>;
  abstract updateRecord(record: IRecord): Promise<IRecord>;

  abstract deleteTemplate(templateId: number): Promise<void>;
  abstract deleteRecord(recordId: number): Promise<void>;
}
