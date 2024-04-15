import { Helper, SafeString } from '@neutrinodev/core';

export default class AndHelper extends Helper {
  render(params: unknown[]) {
    for (let condition of params) {
      if (`${condition}`.startsWith('data:')) { condition = false; }
      if (condition instanceof SafeString) { condition = condition.toString(); }
      if (Array.isArray(condition) && !condition.filter(Boolean).length) { condition = false; }
      if (!condition) { return false; }
    }
    return true;
  }
}
