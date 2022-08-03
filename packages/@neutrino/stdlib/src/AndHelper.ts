import { Helper } from '@neutrino/core';

export default class AndHelper extends Helper {
  render(params: any[]) {
    for (const condition of params) {
      if (!condition) { return false; }
    }
    return true;
  }
}
