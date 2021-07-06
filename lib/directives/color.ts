import { BaseDirective, DirectiveAttrs } from './base';

export default class ColorDirective extends BaseDirective {

  options = {
    default: '#000000',
    label: '',
    help: '',
    priority: 0,
  }

  attrs: DirectiveAttrs = {
    required: false,
    placeholder: '',
  }

  /**
   * Renders either a text or textarea input
   */
  input(name: string, value = '') {
    return `<input type=color name="${name}" value="${value || this.options.default}" ${this.htmlAttrs()}>`;
  }
}
