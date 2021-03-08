import escape from 'lodash.escape';

import { BaseDirective } from './base';

export default class UrlDirective extends BaseDirective {

  options = {
    default: '',
    label: '',
    help: '',
    priority: 0,
    prefix: '',
  }

  attrs = {
    placeholder: '',
    required: false,
  }

  input(name: string, value = '') {

    if (value === this.options.default) { value = ''; }

    return `<div class="input__url"><span>${this.options.prefix || ''}</span><input type="url" name="${name}" placeholder="${escape(this.options.default)}" value="${escape(value)}" ${this.htmlAttrs}></div>`;
  }
}