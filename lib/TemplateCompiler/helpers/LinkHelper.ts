import { NeutrinoHelper } from './types';

import * as directives from '../../directives';

const LinkHelper: NeutrinoHelper = {
  isField: false,
  isBranch: false,
  getType() { return 'link'; },
  run(value, options) {
    const link = directives.get('link').normalize((typeof value === 'function') ? value() : value);
    const context = { blockParams: [link] };
    if (!link.url || !link.name) { return options.inverse ? options.inverse(this) : ''; }
    return link ? options.fn(this, context) : '';
  },
  blockParam() { return undefined; }
};

export default LinkHelper;