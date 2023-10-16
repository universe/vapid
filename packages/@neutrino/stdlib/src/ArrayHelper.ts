import { Helper, NeutrinoValue } from '@neutrino/core';

export default class ArrayHelper extends Helper {
  render(...params: unknown[]) {
    return params.slice(0, -1) as unknown as NeutrinoValue;
  }
}
