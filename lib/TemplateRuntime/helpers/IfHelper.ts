import { SafeString} from '../types';
import { NeutrinoHelper } from './types';

const IfHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'if'; },
  run(params, _hash, options) {
    let [condition, ifValue, elseValue] = params;
    if (`${condition}`.startsWith('data:')) { condition = false; }
    if (condition instanceof SafeString) { condition = condition.toString(); }
    if (Array.isArray(condition) && !condition.length) { condition = false; }
    if (!options.block) { return condition ? ifValue : elseValue; }
    if (condition) { return options.block(); }
    if (options.inverse) { return options.inverse(); }
    return '';
  }
}

export default IfHelper;