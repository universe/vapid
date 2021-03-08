import { PageType } from '../../Database/models/Template';
import { BlockNodes, NeutrinoHelper, ParsedExpr } from './types';

const SectionHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType(leaf: ParsedExpr) { return leaf.hash.multiple ? PageType.COLLECTION : PageType.SETTINGS; },

  run(data = [], options) {
    let out = '';
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      out += options.fn(item, { data: options.data });
    }
    return out;
  },

  blockParam(idx: number, node: BlockNodes) {
    if (idx > 0) { return undefined; }
    return {
      name: node.params[0].original,
      type: PageType.SETTINGS,
      isPrivate: !!node.params[0].data,
    };
  }
};

export default SectionHelper;