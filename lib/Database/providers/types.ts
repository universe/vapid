import { Template, ITemplate, PageType, IRecord, Record  } from '../models';

export abstract class IProvider<Config = any> {
  config: Config;
  constructor(config: Config) {
    this.config = config;
  }
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract log(): void;

  async getIndex(): Promise<Record | null> {
    const template = await this.getTemplateByName('index', PageType.PAGE);
    if (!template) { return null; }
    return (await this.getRecordsByTemplateId(template.id))[0] || null;
  }

  async getGeneral(): Promise<Record | null> {
    const template = await this.getTemplateByName('general', PageType.SETTINGS);
    if (!template) { return null; }
    return (await this.getRecordsByTemplateId(template.id))[0] || null;
  }

  abstract getAllTemplates(): Promise<Template[]>;
  abstract getAllRecords(): Promise<Record[]>;

  abstract getTemplateById(id: number): Promise<Template | null>;
  abstract getTemplateByName(name: string, type: PageType): Promise<Template | null>;
  abstract getTemplatesByType(type: PageType): Promise<Template[]>;

  abstract getRecordById(id: number): Promise<Record | null>;
  abstract getRecordBySlug(slug: string): Promise<Record | null>;
  abstract getRecordsByTemplateId(id: number): Promise<Record[]>;
  abstract getRecordsByType(type: PageType): Promise<Record[]>;
  abstract getChildren(id: number): Promise<Record[]>;

  abstract updateTemplate(template: ITemplate): Promise<Template>;
  abstract updateRecord(record: IRecord): Promise<Record>;

  abstract deleteTemplate(templateId: number): Promise<void>;
  abstract deleteRecord(recordId: number): Promise<void>;
}
