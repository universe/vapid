import escape from 'lodash.escape';
import strftime from 'strftime';
import { BaseDirective, DirectiveAttrs } from './base';

const DEFAULT_FORMAT = '%B %e, %Y';

export default class DateDirective extends BaseDirective {

  options = {
    default: '#000000',
    label: '',
    help: '',
    priority: 0,
    format: DEFAULT_FORMAT,
    time: false,
  }

  attrs: DirectiveAttrs = {
    required: false,
    placeholder: '',
  }

  /**
   * Parses into a Date object, and formats
   * Formatting options provided via strftime.
   *
   * @param {string} value - a string representation of a date
   * @return {string} formatted date
   */
  input(name: string, value = '') {
    const type = this.options.time ? 'datetime-local' : 'date';
    return `${value}<input type="${type}" name="${name}" value="${value}" hmmm="${value}" ${this.htmlAttrs()}>`;
  }

  /**
   * Parses into a Date object, and formats
   * Formatting options provided via strftime.
   *
   * @param {string} value - a string representation of a date
   * @return {string} formatted date
   */
  render(value: string) {
    const strftimeUTC = strftime.timezone('0000');
    const date = new Date(`${value} UTC`);
    const utc = new Date(date.getTime());
    let { format } = this.options;

    if (this.options.time && this.options.format === DEFAULT_FORMAT) {
      format += ' at %l:%M %p';
    }

    // TODO: Not super excited that I'll have to remember to escape anytime this is overridden
    //       Maybe don't override, and instead universally apply a set of defined "filters"?
    return isNaN(date.getTime()) ? escape(value) : strftimeUTC(format, utc);
  }
}
