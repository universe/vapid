import { NeutrinoHelper, SafeString } from '../types';

const LogHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'log'; },
  run(params, _hash, _options) {
    console.log(...params);
    return new SafeString('');
  }
}

export default LogHelper;
