import { SafeString } from '../TemplateCompiler/helpers';
import pino from 'pino';

import ChoiceDirective from './choice';
import ColorDirective from './color';
import DateDirective from './date';
import HtmlDirective from './html';
import ImageDirective from './image';
import LinkDirective from './link';
import NumberDirective from './number';
import TextDirective from './text';
import UrlDirective from './url';

const logger = pino();

// TODO: Allow custom directives in site folder?
const DIRECTIVES = {
  choice: ChoiceDirective,
  color: ColorDirective,
  date: DateDirective,
  html: HtmlDirective,
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
  let name = params.type === undefined ? 'text' : params.type;

  // Only show warning if someone explicity enters a bad name
  if (!name || !DIRECTIVES[name]) {
    logger.warn(`Directive type '${name}' does not exist. Falling back to 'text'`);
    name = 'text';
  }

  return (new DIRECTIVES[name]()).init(params, meta);
}

export async function helper(value: any, attrs: Record<string, string>, meta: Record<string, string>) {
  const directive = find(attrs, meta);
  // @ts-ignore
  const out = await directive.render(value);
  return () => (typeof out === 'string' && out) ? new SafeString(out) : out;
}
