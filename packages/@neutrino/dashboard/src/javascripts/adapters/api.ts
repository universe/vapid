import type { IMedia, IRecord } from '@neutrino/core';
import type { IWebsite } from '@neutrino/runtime';

import { DataAdapter, SortableUpdate } from "./types";

export default class APIAdapter extends DataAdapter {
  private csrf = 'REPLACE_ME';
  private API_URL = 'http://localhost:1776';

  constructor(url?: string) {
    super();
    this.API_URL = url || this.API_URL;
  }

  async getSiteData(): Promise<IWebsite> {
    return (await fetch(`${this.API_URL}/api/data`, {
      method: 'GET',
      headers: {
        'x-csrf-token': this.csrf,
        'Content-Type': 'application/json',
      },
    })).json() as Promise<IWebsite>;
  }

  async updateRecord(record: IRecord): Promise<IRecord> {
    const res = await window.fetch(`${this.API_URL}/api/record`, {
      method: 'POST',
      headers: {
        'x-csrf-token': this.csrf,
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
          'x-csrf-token': this.csrf,
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
        'x-csrf-token': this.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
    return await res.json();
  }

  async saveFile(id: string, b64Image: string | Blob, type = 'image/png'): Promise<IMedia | null> {
    const blob = typeof b64Image === 'string' ? await fetch(b64Image).then(res => res.blob()) : b64Image;
    const filename = [ id, '.', type.match(/^image\/(\w+)$/i)?.[1] ].join('');

    // generate a form data
    const formData = new FormData();
    formData.set('file', blob, filename);
    // formData.set('_csrf', this.csrf);
    const res = await fetch(`${this.API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    }).then(r => r.json());
    if (res.status !== 'success') { throw new Error(res.message); }
    return res.data;
  }
}
