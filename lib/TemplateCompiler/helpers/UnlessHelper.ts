import IfHelper from './IfHelper';
import { NeutrinoHelper } from './types';

const UnlessHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return null; },
  run(input, ...args) {
    let condition = input;
    if (`${condition}`.startsWith('data:')) { condition = false; }
    return IfHelper.run.call(this, !condition, ...args);
  },

  blockParam() { return undefined; }
};

export default UnlessHelper;