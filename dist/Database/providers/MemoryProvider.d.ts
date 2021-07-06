import { PageType, ITemplate, Template, IRecord, Record as DBRecord } from '../models';
import { IProvider } from './types';
export interface MemoryProviderConfig {
    path?: string;
}
export default class MemoryProvider extends IProvider<MemoryProviderConfig> {
    #private;
    start(): Promise<void>;
    stop(): Promise<void>;
    log(): void;
    getAllTemplates(): Promise<Template[]>;
    getAllRecords(): Promise<DBRecord[]>;
    getTemplateById(id: number): Promise<Template | null>;
    getTemplateByName(name: string, type: PageType): Promise<Template | null>;
    getTemplatesByType(type: PageType): Promise<Template[]>;
    getRecordById(id: number): Promise<DBRecord | null>;
    getRecordBySlug(slug: string): Promise<DBRecord | null>;
    getRecordsByTemplateId(id: number): Promise<DBRecord[]>;
    getRecordsByType(type: PageType): Promise<DBRecord[]>;
    getChildren(id: number): Promise<DBRecord[]>;
    /**
     * Update a section's attributes
     * Primarily used by the Vapid module when rebuilding the site
     */
    updateTemplate(update: ITemplate): Promise<Template>;
    /**
     * Update a section's attributes
     * Primarily used by the Vapid module when rebuilding the site
     */
    updateRecord(update: IRecord): Promise<DBRecord>;
    deleteTemplate(templateId: number): Promise<void>;
    deleteRecord(recordId: number): Promise<void>;
}
