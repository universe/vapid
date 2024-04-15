import 'mocha';

import { PageType, stampField, stampTemplate } from '@neutrinodev/core';
import * as assert from 'assert';

import { parse } from '../src/parser.js';

describe('Block Variables', () => {
  it('shadows parent scope', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, '{{setting.one}}{{#each @collection as |setting|}}{{setting.two}}{{/each}}').templates, {
      'name-collection': stampTemplate({
        name: 'name',
        type: PageType.COLLECTION,
        fields: {
          two: stampField({
            key: 'two',
            type: 'text',
            priority: Infinity,
            templateId: null,
            options: { templateId: null, type: 'text' },
          }),
        },
      }),
      'name-page': stampTemplate({ name: 'name', type: PageType.PAGE }),
      'setting-settings': stampTemplate({
        name: 'setting',
        type: PageType.SETTINGS,
        fields: {
          one: stampField({
            key: 'one',
            type: 'text',
            priority: Infinity,
            templateId: null,
            options: { templateId: null, type: 'text' },
          }),
        },
      }),
    });
  });
});
