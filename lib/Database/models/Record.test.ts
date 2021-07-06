import { describe, it } from '@jest/globals';

import { Record } from './Record';
import { PageType, Template } from './Template';

describe('Record Models', () => {
  it('Replaces first name tag', () => {
    const record = new Record({
      id: 100,
      templateId: 1,
      parentId: null,
      content: {},
      metadata: {},
      position: 0,
      slug: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }, new Template({
      id: 1,
      name: 'test',
      sortable: true,
      options: {},
      fields: {},
      type: PageType.PAGE,
    }));
    expect(record.permalink()).toBe('/test-100');
  });
});
