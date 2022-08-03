import { describe, expect, it } from '@jest/globals';

import { PageType } from '../types.js';
import { Record } from './Record.js';
import { Template } from './Template.js';

describe('Record Models', () => {
  it('Has a default slug', () => {
    const tmpl = new Template({
      name: 'test',
      sortable: true,
      options: {},
      fields: {},
      metadata: {},
      type: PageType.PAGE,
    });
    const record = new Record({
      id: '100',
      templateId: tmpl.id,
      parentId: null,
      name: null,
      slug: 'test--100',
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      content: {},
      metadata: {},
    }, tmpl, null);
    expect(record.permalink()).toBe('/test--100');
  });
});
