import escape from 'lodash.escape';

import { BaseDirective, DirectiveAttrs } from './base';

interface TextDirectiveAttrs extends DirectiveAttrs {
  maxlength?: number,
}

export default class TextDirective extends BaseDirective {

  options = {
    default: '',
    label: '',
    help: '',
    priority: 0,
    long: false,
  }

  attrs: TextDirectiveAttrs = {
    required: false,
    placeholder: '',
    maxlength: undefined,
  }

  /**
   * Renders either a text or textarea input
   */
  input(name: string, value = '') {

    if (value === this.options.default) { value = ''; }

    if (this.options.long) {
      return `<textarea name=${name} ${this.htmlAttrs} placeholder="${escape(this.options.default)}" resize=false>${value}</textarea>`;
    }

    const type = name.toLowerCase() === 'content[email]' ? 'email' : 'text';
    return `<input type="${type}" name="${name}" placeholder="${escape(this.options.default)}" value="${escape(value)}" ${this.htmlAttrs}>`;
  }
}
