import { BaseDirective } from './base';

export default class NumberDirective extends BaseDirective<number> {

  options = {
    default: 0,
    label: '',
    help: '',
    priority: 0,
    range: false,
  }

  attrs = {
    placeholder: '',
    required: false,
    min: 0,
    max: Infinity,
    step: 1,
  }

  serialize(value: number) {
    return Number(value);
  }

  /**
   * Renders either a number
   */
  input(name: string, value = this.options.default) {
    const type = this.options.range ? 'range' : 'number';
    const label = this.options.range ? `<div class="ui left pointing basic label">${value || '—'}</div>` : '';
    return `<input type="${type}" name="${name}" value="${value}" ${this.htmlAttrs()}>${label}`;
  }
}
