import { NeutrinoHelper } from './types';

const OrHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'or'; },
  run(params, _hash, _options) {
    for (const condition of params) {
      if (!!condition) { return condition; }
    }
    return false;
  }
}

export default OrHelper;
