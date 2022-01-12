import { NeutrinoHelper } from './types';

const AndHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'and'; },
  run(params, _hash, _options) {
    for (const condition of params) {
      if (!condition) { return false; }
    }
    return true;
  }
}

export default AndHelper;
