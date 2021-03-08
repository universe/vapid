import { Json } from '@universe/util';
import escape from 'lodash.escape';

import { Record } from '../Database/models/Record';

/**
 * Directive Options Base Interface
 *
 * @option {string} [label] - form label
 * @option {string} [help] - help text under form field
 * @option {string} [help] - help text under form field
 * @attr {string} [placeholder=''] - input placeholder
 * @attr {boolean} [required=true] - all fields are required by default
 */
export interface DirectiveOptions<DirectiveType = string> {
  default: DirectiveType;
  label: string;
  help: string;
  priority: number;
}

export interface DirectiveAttrs {
  required: boolean,
  placeholder: string,
}

export type BlockRenderer = Json | { toString: () => string; };

/**
 * Attempts to cast value to the correct type
 *
 * @param {string} val
 * @return {string|number|boolean}
 */
function coerceType(val: any): string | number | boolean | null {
  try { return JSON.parse(val); } catch (err) { return val; }
}

/**
 * The base class that all directives inherit from.
 * These are the crux of Vapid, allowing templates to specify input attributes and render content.
 */
export abstract class BaseDirective<DirectiveType = string> {

  options!: DirectiveOptions<DirectiveType>;
  attrs!: DirectiveAttrs;
  meta: { pages: Record[] } = {
    pages: [],
  };

  constructor(params = {}, meta = {}) {
    this.meta = { ...this.meta, ...meta };

    // Separate options and attributes, discarding ones that aren't explicity specified
    for (const [key, value] of Object.entries(params)) {
      const coerced = coerceType(value);
      if (Object.hasOwnProperty.call(this.options || {}, key)) {
        this.options[key] = coerced;
      } else if (Object.hasOwnProperty.call(this.attrs || {}, key)) {
        this.attrs[key] = coerced;
      }
    }
  }

  /**
   * Converts attrs object into HTML key=value attributes
   * Typically used by the input method
   */
  htmlAttrs(): string {
    const pairs = Object.entries(this.attrs).reduce<string[]>((memo, [key, value]) => {
      if (value !== undefined && value !== false) {
        memo.push(`${key}="${escape(value)}"`);
      }
      return memo;
    }, []);

    return pairs.join(' ');
  }

  /**
   * Renders an HTML text input
   * Typically used in the dashboard forms, or front-end contact forms
   */
  abstract input(name: string, value: DirectiveType): string;

  preview(value = this.options.default): string {
    return escape(`${value}`);
  }

  async render(value = this.options.default): Promise<string | BlockRenderer> {
    return escape(`${value}`);
  }

  serialize(value = this.options.default): DirectiveType {
    return value;
  }

}
