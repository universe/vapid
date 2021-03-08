import { NeutrinoHelper } from './types';

const EqHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'eq'; },
  blockParam() { return undefined; },
  run(value1: unknown, value2: unknown): string {
    return value1 === value2 ? 'true' : 'false';
  },
};

export default EqHelper;