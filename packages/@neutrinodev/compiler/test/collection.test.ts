import 'mocha';

import { PageType, stampField, stampTemplate } from '@neutrinodev/core';
import * as assert from 'assert';

import { parse } from '../src/parser.js';

describe('Collection', () => {
  it('return a bare page when no collection is referenced', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, 'empty').templates, {
      'name-page': stampTemplate({ name: 'name', type: PageType.PAGE }),
    });
  });
  it('adds a local collection when referenced', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, '{{@collection}}').templates, {
      'name-collection': stampTemplate({ name: 'name', type: PageType.COLLECTION }),
      'name-page': stampTemplate({ name: 'name', type: PageType.PAGE }),
    });
  });
  it('adds an external collection when referenced', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, '{{@collection.foo}}').templates, {
      'foo-collection': stampTemplate({ name: 'foo', type: PageType.COLLECTION }),
      'foo-page': stampTemplate({ name: 'foo', type: PageType.PAGE }),
      'name-page': stampTemplate({ name: 'name', type: PageType.PAGE }),
    });
  });
  it('adds a local reference to an external collection', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, '{{@collection.foo this.bar}}').templates, {
      'foo-collection': stampTemplate({ name: 'foo', type: PageType.COLLECTION }),
      'foo-page': stampTemplate({ name: 'foo', type: PageType.PAGE }),
      'name-page': stampTemplate({
        name: 'name',
        type: PageType.PAGE,
        fields: {
          bar: stampField({
            key: 'bar',
            type: 'collection',
            priority: Infinity,
            templateId: 'foo',
            options: { templateId: 'foo', type: 'collection' },
          }),
        },
      }),
    });
  });

  it('crawls child blocks for local collection', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, '{{#each @collection as |record|}}{{record.biz}}{{/each}}').templates, {
      'name-collection': stampTemplate({
        name: 'name',
        type: PageType.COLLECTION,
        fields: {
          biz: stampField({
            key: 'biz',
            type: 'text',
            priority: Infinity,
            templateId: null,
            options: { templateId: null, type: 'text' },
          }),
        },
      }),
      'name-page': stampTemplate({
        name: 'name',
        type: PageType.PAGE, 
      }),
    });
  });

  it('crawls child blocks', () => {
    assert.deepStrictEqual(parse('name', PageType.PAGE, '{{#each (@collection.foo this.bar) as |record|}}{{record.biz}}{{/each}}').templates, {
      'foo-collection': stampTemplate({
        name: 'foo',
        type: PageType.COLLECTION,
        fields: {
          biz: stampField({
            key: 'biz',
            type: 'text',
            priority: Infinity,
            templateId: null,
            options: { templateId: null, type: 'text' },
          }),
        },
      }),
      'foo-page': stampTemplate({ name: 'foo', type: PageType.PAGE }),
      'name-page': stampTemplate({
        name: 'name',
        type: PageType.PAGE,
        fields: {
          bar: stampField({
            key: 'bar',
            type: 'collection',
            priority: Infinity,
            templateId: 'foo',
            options: { templateId: 'foo', type: 'collection' },
          }),
        },
      }),
    });
  });
});
