import { NeutrinoHelper } from './types';

const EqHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'eq'; },
  run([value1, value2]): string {
    if (Array.isArray(value1) && value1.length === 1) { value1 = value1[0]; }
    if (Array.isArray(value2) && value2.length === 1) { value2 = value2[0]; }
    return value1 === value2 ? 'true' : 'false';
  },
};

export default EqHelper;