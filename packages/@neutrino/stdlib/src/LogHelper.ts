import { Helper, SafeString } from '@neutrino/core';

export default class LogHelper extends Helper {
  render(params: any[]) {
    console.log('[DEBUG]', ...params);
    return new SafeString('');
  }
}
