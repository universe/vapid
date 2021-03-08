import { NeutrinoHelper } from './types';

const DateHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'date'; },
  blockParam() { return undefined; },
  run(value) {
    return value ? value.toLocaleString('en-us', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) : '';
  }

};

export default DateHelper;