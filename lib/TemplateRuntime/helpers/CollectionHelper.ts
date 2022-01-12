import { appendFragment, NeutrinoHelper } from './types';

import { RECORD_META } from '../types';
import { PageType } from '../../Database/models';

const CollectionHelper: NeutrinoHelper = {
  isField: false,
  isBranch: PageType.COLLECTION,

  getType() { return 'collection'; },

  run([data], hash={}, options) {
    const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
    const limit = hash.limit || Infinity;

    if (!options.fragment) { throw new Error('The {{collection}} helper must be used as a block helper.'); }

    // If collection is empty, and the helper provides an empty state, render the empty state.
    if (items.length === 0) return options.inverse?.() || '';

    // Otherwise, render each item!
    let out = options.fragment;
    let index = 0;

    for (const item of items) {
      if (index >= limit) { break; }
      appendFragment(out, options.block?.([item], {
        index,
        length: items.length,
        first: index === 0,
        last: index === items.length - 1,
        next: items[index + 1],
        prev: items[index - 1],
        record: item[RECORD_META],
      }));
      index += 1;
    }
    return out;
  },
};

export default CollectionHelper;