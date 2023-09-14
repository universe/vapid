import { Helper,NeutrinoValue, SafeString } from '@neutrino/core';

export default class OrHelper extends Helper {
  render(params: NeutrinoValue[]) {
    for (let condition of params) {
      if (`${condition}`.startsWith('data:')) { condition = false; }
      if (condition instanceof SafeString) { condition = condition.toString(); }
      if (Array.isArray(condition) && !condition.filter(Boolean).length) { condition = false; }
      if (condition) { return condition; }
    }
    return false;
  }
}
