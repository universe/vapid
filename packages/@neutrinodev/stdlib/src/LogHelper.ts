import { Helper, NeutrinoValue, SafeString } from '@neutrinodev/core';

export default class LogHelper extends Helper {
  render(params: NeutrinoValue[]) {
    console.log('[DEBUG]', ...params);
    return new SafeString('');
  }
}
