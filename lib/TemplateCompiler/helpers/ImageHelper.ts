import { NeutrinoHelper } from './types';
import * as directives from '../../directives';

const LinkHelper: NeutrinoHelper = {
  getType() { return 'image'; },
  run(value, options) {
    const image = directives.get('image').normalize((typeof value === 'function') ? value() : value);
    const context = { blockParams: [image] };
    // if (!image.url || !link.name) { return options.inverse ? options.inverse(this) : ''; }
    return image ? options.fn(this, context) : '';
  },
  isField: false,
  isBranch: false,
  blockParam() { return undefined; },
};

export default LinkHelper;