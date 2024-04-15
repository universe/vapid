import { Helper, NeutrinoHelperOptions, NeutrinoValue, SafeString } from '@neutrino/core';

export default class UnlessHelper extends Helper {
  render([ condition, ifValue, elseValue ]: [NeutrinoValue, NeutrinoValue, NeutrinoValue], _hash={}, options: NeutrinoHelperOptions) {
    if (`${condition}`.startsWith('data:')) { condition = false; }
    if (condition instanceof SafeString) { condition = condition.toString(); }
    if (Array.isArray(condition) && !condition.filter(Boolean).length) { condition = false; }
    condition = !condition;
    if (!options.block) { return condition ? ifValue : elseValue; }
    if (condition) { return options.block(); }
    if (options.inverse) { return options.inverse(); }
    return '';
  }
}
