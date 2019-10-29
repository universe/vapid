const { Utils } = require('../utils');

/**
 * Defaults
 *
 * @attrs {number} [maxlength] - Maximum number of input characters
 * @options {boolean} [long] - determines text or textarea input
 */
const DEFAULTS = {
  attrs: {
    maxlength: undefined,
  },

  options: {
    long: false,
  },
};

module.exports = (BaseDirective) => {
  /*
   * Plain text
   */
  class TextDirective extends BaseDirective {
    /**
     * @static
     *
     * @return {Object} default attrs and options
     */
    static get DEFAULTS() {
      return DEFAULTS;
    }

    /* eslint-disable class-methods-use-this */
    /**
     * Returns the type of directive instance
     *
     * @return {string} the directive type.
     */
    get type() { return 'text'; }
    /* eslint-enable class-methods-use-this */

    /**
     * Renders either a text or textarea input
     *
     * @param {string} name
     * @param {string} [value=this.options.default]
     * @return {string} rendered input
     */
    input(name, value = this.options.default) {
      if (this.options.long) {
        return `<textarea name=${name} ${this.htmlAttrs}>${value}</textarea>`;
      }

      const type = name.toLowerCase() === 'content[email]' ? 'email' : 'text';
      return `<input type="${type}" name="${name}" value="${Utils.escape(value)}" ${this.htmlAttrs}>`;
    }
  }

  return TextDirective;
};
