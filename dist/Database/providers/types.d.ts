import { Template, ITemplate, PageType, IRecord, Record } from '../models';
export declare abstract class IProvider<Config = any> {
    config: Config;
    constructor(config: Config);
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    abstract log(): void;
    getIndex(): Promise<Record | null>;
    getGeneral(): Promise<Record | null>;
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
