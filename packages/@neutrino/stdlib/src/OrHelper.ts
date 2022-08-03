import { Helper } from '@neutrino/core';

export default class OrHelper extends Helper {
  render(params: any[]) {
    for (const condition of params) {
      if (condition) { return condition; }
    }
    return false;
  }
}
