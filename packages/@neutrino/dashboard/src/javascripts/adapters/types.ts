import type { IMedia, IRecord } from '@neutrino/core';
import type { IWebsite } from '@neutrino/runtime';

export interface SortableUpdate {
  id: string;
  from: number;
  to: number;
  parentId: string | null;
}

export abstract class DataAdapter {
  async init(): Promise<void> { return Promise.resolve(); }
  abstract getSiteData(): Promise<IWebsite>;
  abstract updateRecord(record: IRecord): Promise<IRecord>;
  abstract updateOrder(update: SortableUpdate): Promise<void>;
  abstract deleteRecord(record: IRecord): Promise<void>;
  abstract saveFile(id: string, b64Image: string | Blob, type: string): Promise<IMedia | null>;
}