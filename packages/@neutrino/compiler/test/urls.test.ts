import 'mocha';

import { PageType, stampField, stampTemplate } from '@neutrino/core';
import * as assert from 'assert';

import { parse } from '../src/parser.js';

describe('URL Helper', () => {
  it('accepts a prefix', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, '{{this.link type="url" prefix="@page"}}').templates, {
      'name-page': stampTemplate({
        name: 'name',
        type: PageType.PAGE,
        fields: {
          link: stampField({
            key: 'link',
            type: 'url',
            priority: Infinity,
            templateId: null,
            options: { templateId: null, type: 'url', prefix: '@page' },
          }),
        },
      }),
    });
  });
});
