import { Helper, NeutrinoValue, SafeString } from '@neutrino/core';

export default class LogHelper extends Helper {
  render(params: NeutrinoValue[]) {
    console.log('[DEBUG]', ...params);
    return new SafeString('');
  }
}
