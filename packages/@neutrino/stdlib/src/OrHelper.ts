import { NeutrinoValue, Helper } from '@neutrino/core';

export default class OrHelper extends Helper {
  render(params: NeutrinoValue[]) {
    for (const condition of params) {
      if (condition) { return condition; }
    }
    return false;
  }
}
