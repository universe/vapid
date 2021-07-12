import { NeutrinoHelper } from './types';

const DateHelper: NeutrinoHelper = {
  isField: true,
  isBranch: false,
  getType() { return 'date'; },
  run([value]) {
    return value ? value.toLocaleString('en-us', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) : '';
  }

};

export default DateHelper;