import { Helper, SafeString } from '@neutrino/core';

export default class AndHelper extends Helper {
  render(params: any[]) {
    for (let condition of params) {
      if (`${condition}`.startsWith('data:')) { condition = false; }
      if (condition instanceof SafeString) { condition = condition.toString(); }
      if (Array.isArray(condition) && !condition.length) { condition = false; }
      if (!condition) { return false; }
    }
    return true;
  }
}
