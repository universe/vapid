import { NeutrinoHelper, appendFragment } from './types';
import { toKebabCase, toTitleCase } from '@universe/util';

import { SafeString } from '../types';
import { PageType } from '../../Database/models';

const CollateHelper: NeutrinoHelper = {
  isField: false,
  isBranch: PageType.COLLECTION,
  getType() { return 'collate'; },
  run([collection], hash={}, options) {
    if (!options.fragment) { throw new Error('The {{collate}} helper must be used as a block helper.'); }

    const values = new Set();
    let out = options.fragment;
    const prop = hash.key;

    if (!prop) {
      throw new Error('You must provide a key to the `{{collate}}` helper.');
    }

    for (const record of collection || []) {
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
      console.log('colate', value);
      appendFragment(out, options.block?.([{
        toString() { return toTitleCase(value || hash.default); },
        value: value,
        title: toTitleCase(value || hash.default),
        slug: value ? toKebabCase(`${value}`) : toKebabCase(hash.default),
      }]));
    }

    return out;
  }
};

export default CollateHelper;
