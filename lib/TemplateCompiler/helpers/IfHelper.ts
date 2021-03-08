import { NeutrinoHelper } from './types';

const IfHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'if'; },
  blockParam() { return undefined; },
  run(input, ...args) {
    let condition = input;
    if (`${condition}`.startsWith('data:')) { condition = false; }
    const options = args.pop();
    const [ifValue, elseValue] = args;
    if (!options.fn) { return condition ? ifValue : elseValue; }
    if (condition) { return options.fn(this); }
    if (options.inverse) { return options.inverse(this); }
    return '';
  }

}

export default IfHelper;