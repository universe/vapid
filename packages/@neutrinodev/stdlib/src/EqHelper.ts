import { Helper } from '@neutrinodev/core';

export default class EqHelper extends Helper {
  render([ value1, value2 ]: (unknown | unknown[])[]): boolean {
    if (Array.isArray(value1) && value1.filter(Boolean).length === 1) { value1 = value1[0]; }
    if (Array.isArray(value2) && value2.filter(Boolean).length === 1) { value2 = value2[0]; }
    return value1 === value2;
  }
}
