import { NeutrinoHelper, SafeString } from './types';

import { toKebabCase } from '@universe/util';
import { PageType } from '../../Database/models';

const CollateHelper: NeutrinoHelper = {
  isField: false,
  isBranch: PageType.COLLECTION,
  getType() { return 'collate'; },
  run([collection], hash={}, options) {
    const values = new Set();
    let out = '';
    const prop = hash.key;

    if (!prop) {
      throw new Error('You must provide a key to the `{{collate}}` helper.');
    }

    for (const record of collection) {
      let value = typeof record[prop] === 'function' ? record[prop]() : record[prop];
      if (!Array.isArray(value)) { value = value ? [value] : []; }
      if (!value.length && hash.default) {
        values.add(undefined);
      }
      for (let v of value) {
        if (v instanceof SafeString) { v = v.toString(); }
        values.add(v);
      }
    }

    for (const value of values) {
      out += options.block?.([{
        value,
        name: value || hash.default,
        slug: value ? toKebabCase(`${value}`) : toKebabCase(hash.default),
      }]);
    }
    return out;
  }
};

export default CollateHelper;
