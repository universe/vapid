import { NeutrinoHelper } from './types';

import { DATA_SYMBOL } from '../constants';
import { PageType } from '../../Database/models';

const CollectionHelper: NeutrinoHelper = {
  isField: false,
  isBranch: PageType.COLLECTION,

  getType() { return 'collection'; },

  run(data, options) {
    const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
    const limit = (options.hash && options.hash.limit) || Infinity;

    // If collection is empty, and the helper provides an empty state, render the empty state.
    if (items.length === 0 && options.inverse) return options.inverse(this) || '';

    // Otherwise, render each item!
    let out = '';
    let index = 0;

    for (const item of items) {
      if (index >= limit) { break; }
      out += options.fn(this, {
        data: {
          index,
          length: items.length,
          first: index === 0,
          last: index === items.length - 1,
          next: items[index + 1],
          prev: items[index - 1],
          record: item[DATA_SYMBOL],
        },
        blockParams: [item],
      });
      index += 1;
    }
    return out;
  },

  blockParam(idx, node) {
    if (idx > 0) { return undefined; }
    return {
      name: node.params[0].original,
      type: PageType.COLLECTION,
      isPrivate: !!node.params[0].data,
    };
  }
};

export default CollectionHelper;