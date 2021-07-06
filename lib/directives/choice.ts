import { BaseDirective, DirectiveAttrs, DirectiveOptions } from './base';

/**
 * Available input types
 * See ChoiceDirective.determineInputType()
 */
enum INPUT_TYPES {
  checkbox = 'checkbox',
  toggle = 'toggle',
  radio = 'radio',
  dropdown = 'dropdown',
}

/**
 * @private
 *
 * Turns a comma-separated list of choices into an array
 *
 * @param {string} str
 * @return {array}
 *
 * @todo Needs a better parser that takes into account quotes, escaped chars etc
 */
function _possibilites(str = '') {
  return str?.split ? str.split(',').map(p => p.trim()).filter(Boolean) : [];
}

interface ChoiceOptions {
  options: string;
  input: INPUT_TYPES | string;
  multiple: boolean;
  custom: boolean;
}

export default class ChoiceDirective extends BaseDirective<string> {

  #possibilities: string[] = [];

  /**
   * Defaults
   *
   * @option {string} [input] - override what type of input is used
   * @option {boolean} [multiple=false] - for multi-select dropdowns
   * @options {string} [options=''] - choices available to the user
   */
  options: DirectiveOptions<string> & ChoiceOptions = {
    options: '',
    input: INPUT_TYPES.checkbox,
    multiple: false,
    default: '',
    custom: false,
    label: '',
    help: '',
    priority: 0,
  }

  attrs: DirectiveAttrs = {
    required: false,
    placeholder: '',
  }

  /**
   * @param {Object} params
   */
  init(params: Record<string, any>, meta: Record<string, any>) {
    super.init(params, meta);
    this.#possibilities = _possibilites(this.options.options || '');
    this.options.input = this.determineInputType();
    // this.options.default = this.options.default || false;
    this.attrs.required = this.#possibilities.length > 1 && this.attrs.required;
    return this;
  }

  /**
   * @private
   *
   * Logic for determining what type of input should be used
   * Based on number of choices, and user-specific options
   *
   * @return {string} input type
   */
  private determineInputType() {
    let input = INPUT_TYPES[this.options.input] ? this.options.input : null;
    const numPossibilities = this.#possibilities.length;


    if (numPossibilities <= 1) {
      return input === 'toggle' ? 'toggle' : 'checkbox';
    } else if (this.options.multiple) {
      return 'dropdown';
    }

    // If we've gotten this far, radio and dropdown are the only options
    input = (input === 'radio' || input === 'dropdown') ? input : null;

    if (numPossibilities <= 3 && !this.options.multiple) {
      return input || 'radio';
    }

    return input || 'dropdown';
  }

  /**
   * Renders the appropritate input, given the possible choices,
   * and what options have been passed in.
   *
   * @param {string} name
   * @param {string} [value=this.options.default]
   * @return {string} rendered input
   *
   * @todo This is nasty
   */
  input(name: string, value = this.options.default) {
    if (this.options.input === 'dropdown') {
      return this._dropdown(name, value);
    } else if (this.#possibilities.length <= 1) {
      return this._checkbox(name, value, true);
    }

    return this.#possibilities.reduce((memo, p) => memo + this._checkbox(name, value, p, p), '');
  }

  /**
   * Renders value(s) into a comma-separated, spaced string
   *
   * @param {array|string} [value=this.options.default]
   * @return {string}
   *
   * @todo Maybe an option to render something other than a comma-separated string?
   */
  /* eslint-disable class-methods-use-this */
  async render(value = this.options.default) {
    if (this.options.multiple) {
      const val: string[] = Array.isArray(value) ? value : [value];
      switch (this.options.input) {
        case 'checkbox':
        case 'toggle':
          return val.map(v => String(v) === 'true');
        default:
          return val;
      }
    } else {
      switch (this.options.input) {
        case 'checkbox':
        case 'toggle':
        case 'radio':
          return String(value) === 'true';
        default:
          return value;
      }
    }
  }

  serialize(value: string): string {
    switch (this.options.input) {
      case 'checkbox':
      case 'toggle':
        return String(value) === 'true' ? 'true' : 'false';
      default:
        return value;
    }
  }

  /* eslint-enable class-methods-use-this */

  /**
   * Helps print the HTML attribute for a required field
   *
   * @return {string}
   */
  get required() {
    return this.attrs.required ? 'required=true' : '';
  }

  /**
   * @private
   *
   * Renders checkbox, toggle, or radio input(s)
   * Based on Semantic UI markup and classes
   *
   * @param {string} name
   * @param {string} value - the value from the database
   * @param {string} inputValue - the value used in the input field
   * @param {string} [label='']
   * @return {string} rendered HTML
   */
  _checkbox(name: string, value: string, inputValue: string | boolean, label = '') {
    const klass = this.options.input === 'checkbox' ? '' : this.options.input;
    const type = this.options.input === 'toggle' ? 'checkbox' : this.options.input;
    const checked = (type === 'checkbox' && value) || (value && value === label) ? 'checked' : '';

    return `
      <div class="ui ${klass} checkbox ${this.#possibilities.length > 1 ? 'checkbox--multiple' : 'checkbox--single'}">
        <input type="hidden" name="${!checked ? name : ''}" value="false" />
        <input type="${type}" id="${name}" name="${name}" value="${inputValue}" ${checked} ${this.required}>
        <label>${label}</label>
      </div>`;
  }

  /**
   * @private
   *
   * Renders a dropdown select menu
   * Based on Semantic UI markup
   *
   * @param {string} name
   * @param {string} [value='']
   * @return {string} rendered HTML
   */
  _dropdown(name: string, value = '') {
    const { placeholder, required } = this.attrs;
    const multiple = this.options.multiple ? 'multiple' : '';
    const custom = this.options.custom ? 'custom' : '';
    const values = Array.isArray(value) ? value : String(value || '').split(',');

    const options = this.#possibilities.reduce((memo, p) => {
      const selected = values.includes(p) ? 'selected' : '';
      const option = `<option value="${p}" ${selected}>${p}</option>`;
      return memo + option;
    }, '');

    return `
      <select name="${name}" class="ui fluid search dropdown ${custom}" ${multiple} ${required}>
        ${(!required || (required && this.options.default)) ? `<option value="${this.options.default || ''}">${this.options.default || placeholder || '---'}</option>` : ''}
        ${options}
      </select>`;
  }
}
