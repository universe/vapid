import IfHelper from './IfHelper';
import { NeutrinoHelper } from './types';

const UnlessHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return null; },
  run([condition, value1, value2]) {
    if (`${condition}`.startsWith('data:')) { condition = false; }
    return IfHelper.run.call(this, [!condition, value1, value2]);
  },
};

export default UnlessHelper;