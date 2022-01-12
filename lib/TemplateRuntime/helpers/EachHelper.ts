import { appendFragment, NeutrinoHelper } from './types';

import { RECORD_META } from '../types';

const EachHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'each'; },
  run([data], _hash, options) {
    const items = (Array.isArray(data) ? data : [data]).filter(Boolean);

    if (!options.fragment) { throw new Error('The {{each}} helper must be used as a block helper.'); }
    let out = options.fragment;

    // If collection is empty, and the helper provides an empty state, render the empty state.
    if (items?.length === 0) return options.inverse?.() || out;

    // Otherwise, render each item!
    let index = 0;
    console.log('each', items);
    for (const item of items) {
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
  }
};

export default EachHelper;