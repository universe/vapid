import { Helper, NeutrinoHelperOptions, NeutrinoValue, SafeString } from '@neutrinodev/core';

export default class IfHelper extends Helper {
  render([ condition, ifValue, elseValue ]: [NeutrinoValue, NeutrinoValue, NeutrinoValue], _hash={}, options: NeutrinoHelperOptions) {
    if (condition instanceof SafeString) { condition = condition.toString(); }
    if (`${condition}`.startsWith('data:')) { condition = false; }
    if (Array.isArray(condition) && !condition.filter(Boolean).length) { condition = false; }
    if (!options.block) { return condition ? ifValue : elseValue; }
    if (condition) { return options.block(); }
    if (options.inverse) { return options.inverse(); }
    return '';
  }
}
