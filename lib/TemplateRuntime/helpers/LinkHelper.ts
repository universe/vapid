import { NeutrinoHelper } from './types';

const LinkHelper: NeutrinoHelper = {
  isField: true,
  isBranch: false,
  getType() { return 'link'; },
  run([link], _hash, options) {
    if (!link || !link.url || !link.name) { return options.inverse ? options.inverse() : ''; }
    return (link ? options.block?.([link]) : '') || '';
  },
};

export default LinkHelper;