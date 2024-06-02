import { IRecord, IWebsite, PageType } from './types.js';

export * from './helpers.js';
export * from './models/index.js';
export * from './types.js';

export type UploadResult = { status: 'pending'; progress: number; } 
  | { status: 'paused'; progress: number; } 
  | { status: 'success'; url: string; } 
  | { status: 'error'; message: string; };

export type UploadFileFunction = {
  (file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  (file: File, name?: string): AsyncIterableIterator<UploadResult>;
}

export interface FileHeaders {
  contentType?: string;
  contentEncoding?: string;
  cacheControl?: string;
}

export abstract class IProvider {
  // Provider lifecycle
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  // Website Config
  abstract getWebsite(): Promise<IWebsite>;

  // Record Management
  abstract getAllRecords(): Promise<Record<string, IRecord>>;
  abstract getRecordById(id: string): Promise<IRecord | null>;
  abstract getRecordBySlug(slug: string, parentId?: string | null): Promise<IRecord | null>;
  abstract getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]>;
  abstract getRecordsByTemplateId(id: string): Promise<IRecord[]>;
  abstract getChildren(id: string): Promise<IRecord[]>;
  abstract updateRecord(record: IRecord): Promise<IRecord>;
  abstract deleteRecord(recordId: string): Promise<void>;

  // Media Management
  abstract mediaUrl(name?: string): Promise<string>;
  abstract saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  abstract saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  abstract saveFile(file: File | string, type?: string, name?: string): AsyncIterableIterator<UploadResult>;
  abstract deployFile(path: string, blob: Blob, headers: FileHeaders): AsyncIterableIterator<UploadResult>;

  // Simple Events System
  #listeners: Record<string, Set<() => void>> = {};
  on(event: string, cb: () => void): void { (this.#listeners[event] = this.#listeners[event] || new Set()).add(cb); }
  off(event: string, cb: () => void): void { (this.#listeners[event] = this.#listeners[event] || new Set()).delete(cb); }
  trigger(event: string){ [...(this.#listeners[event] || [])].map(cb => cb()); }
}
