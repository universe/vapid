import { NeutrinoHelper } from './types';

const EqHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'eq'; },
  run([value1, value2]): string {
    return value1 === value2 ? 'true' : 'false';
  },
};

export default EqHelper;