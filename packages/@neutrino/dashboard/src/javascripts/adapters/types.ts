import type { IRecord, UploadResult } from '@neutrino/core';
import type { IWebsite } from '@neutrino/runtime';

export interface SortableUpdate {
  id: string;
  from: number;
  to: number;
  parentId: string | null;
}

export abstract class DataAdapter {
  async init(): Promise<void> { return Promise.resolve(); }
  abstract getDomain(): string;
  abstract getTheme(): Promise<IWebsite>;
  abstract deployTheme(name: string, version: string): Promise<IWebsite>;
  abstract getAllRecords(): Promise<Record<string, IRecord>>;
  abstract updateRecord(record: IRecord): Promise<IRecord>;
  abstract updateOrder(update: SortableUpdate): Promise<void>;
  abstract deleteRecord(record: IRecord): Promise<void>;
  abstract deploy(siteData: IWebsite, records: Record<string, IRecord>): Promise<void>;

  abstract saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  abstract saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  abstract saveFile(file: File | string, type?: string, name?: string): AsyncIterableIterator<UploadResult>;
}
