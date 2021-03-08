import Handlebars from 'handlebars';

import { Logger } from '../utils';

import TextDirective from './text';
import UrlDirective from './url';
import NumberDirective from './number';
import LinkDirective from './link';
import ImageDirective from './image';

// TODO: Allow custom directives in site folder?
const DIRECTIVES = {
  text: TextDirective,
  url: UrlDirective,
  number: NumberDirective,
  link: LinkDirective,
  image: ImageDirective,
} as const;

/**
 * Lookup function for available directives. Return a new instance if found.
 * Falls back to "text" directive if one can't be found.
 *
 * @params {Object} params - options and attributes
 * @return {Directive} - an directive instance
 */
type Directives = typeof DIRECTIVES;
export function find(params: { type?: string } = {}, meta = {}): InstanceType<Directives[keyof Directives]>  {

  // If no name is given, silently fall back to text.
  const name = params.type === undefined ? 'text' : params.type;

  if (DIRECTIVES[name]) {
    return new DIRECTIVES[name](params, meta);
  }

  // Only show warning if someone explicity enters a bad name
  if (name) { Logger.warn(`Directive type '${name}' does not exist. Falling back to 'text'`); }

  /* eslint-disable-next-line new-cap */
  return new DIRECTIVES.text(params, meta);
}

export function helper(value: any, attrs: Record<string, string>, meta: Record<string, string>) {
  const directive = find(attrs, meta);
  // @ts-ignore
  const out = directive.render(value);
  return () => (typeof out === 'string' ? new Handlebars.SafeString(out) : out);
}

export function get(name: string) {
  return DIRECTIVES[name];
}
