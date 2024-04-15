import type { IRecord,UploadResult } from '@neutrinodev/core';
import type { IWebsite } from '@neutrinodev/runtime';

import { DataAdapter, SortableUpdate } from "./types.js";

export default class APIAdapter extends DataAdapter {
  private API_URL = import.meta.env.API_URL;

  constructor(url?: string) {
    super();
    this.API_URL = url || this.API_URL;
  }

  getDomain(): string {
    return '';
  }

  async getTheme(): Promise<IWebsite> {
    return (await fetch(`${this.API_URL}/api/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })).json() as Promise<IWebsite>;
  }

  async deployTheme(): Promise<IWebsite> {
    throw new Error('Missing Theme.');
  }

  async getAllRecords(): Promise<Record<string, IRecord>> {
    return {};
  }

  async updateRecord(record: IRecord): Promise<IRecord> {
    const res = await window.fetch(`${this.API_URL}/api/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
    const data = await res.json();
    return data;
  }

  async updateOrder(update: SortableUpdate): Promise<void> {
    try {
      await window.fetch(`${this.API_URL}/api/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });
    }
    catch {
      alert('Error: could not reorder records');
    }
  }

  async deleteRecord(record: IRecord): Promise<void> {
    const res = await window.fetch(`${this.API_URL}/api/record`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
    return await res.json();
  }

  saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  /* eslint-disable-next-line require-yield */
  async * saveFile(_file: File | string, _type?: string, _name?: string): AsyncIterableIterator<UploadResult> { 
    return { status: 'error', message: 'File upload not implemented.' };
  }

  // async saveFile(id: string, b64Image: string | Blob, type = 'image/png'): Promise<IMedia | null> {
  //   const blob = typeof b64Image === 'string' ? await fetch(b64Image).then(res => res.blob()) : b64Image;
  //   const filename = [ id, '.', type.match(/^image\/(\w+)$/i)?.[1] ].join('');

  //   // generate a form data
  //   const formData = new FormData();
  //   formData.set('file', blob, filename);
  //   // formData.set('_csrf', this.csrf);
  //   const res = await fetch(`${this.API_URL}/api/upload`, {
  //     method: 'POST',
  //     body: formData,
  //   }).then(r => r.json());
  //   if (res.status !== 'success') { throw new Error(res.message); }
  //   return res.data;
  // }

  async deploy() { 1; }
}
