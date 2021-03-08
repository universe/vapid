import { NeutrinoHelper } from './types';

import * as Handlebars from 'handlebars';
import { toKebabCase } from '@universe/util';

const CollateHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'collate'; },
  blockParam() { return undefined; },
  run(collection, options) {
    const values = new Set();
    let out = '';
    const prop = (options.hash || {}).key;

    if (!prop) {
      throw new Error('You must provide a key to the `{{collate}}` helper.');
    }

    for (const record of collection) {
      let value = typeof record[prop] === 'function' ? record[prop]() : record[prop];
      if (!Array.isArray(value)) { value = value ? [value] : []; }
      if (!value.length && options.hash.default) {
        values.add(undefined);
      }
      for (let v of value) {
        if (v instanceof Handlebars.SafeString) { v = v.toString(); }
        values.add(v);
      }
    }

    for (const value of values) {
      const context = {
        blockParams: [{
          value,
          name: value || options.hash.default,
          slug: value ? toKebabCase(`${value}`) : toKebabCase(options.hash.default),
        }],
      };
      out += options.fn(this, context);
    }
    return out;
  }
};

export default CollateHelper;
