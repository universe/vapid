import { DirectiveMeta, DirectiveField } from './base';
import ChoiceDirective from './choice';
import ColorDirective from './color';
import CollectionDirective from './collection';
import DateDirective from './date';
import HtmlDirective from './html';
import ImageDirective from './image';
import LinkDirective from './link';
import MarkdownDirective from './markdown';
import NumberDirective from './number';
import TextDirective from './text';
import UrlDirective from './url';

// TODO: Allow custom directives in site folder?
const DIRECTIVES = {
  choice: ChoiceDirective,
  color: ColorDirective,
  date: DateDirective,
  time: DateDirective,
  datetime: DateDirective,
  html: HtmlDirective,
  image: ImageDirective,
  link: LinkDirective,
  markdown: MarkdownDirective,
  number: NumberDirective,
  text: TextDirective,
  url: UrlDirective,
  collection: CollectionDirective,
} as const;

/**
 * Lookup function for available directives. Return a new instance if found.
 * Falls back to "text" directive if one can't be found.
 *
 * @params {Object} params - options and attributes
 * @return {Directive} - an directive instance
 */
type Directives = typeof DIRECTIVES;
export type DirectiveTypes = keyof Directives;

export type DirectiveChangeCallback = Parameters<InstanceType<Directives[keyof Directives]>['onChange']>[0]
export function findDirective<Type extends keyof Directives>(
  key: string,
  params: DirectiveField & { type: Type },
  meta: DirectiveMeta,
): InstanceType<Directives[Type]>  {
  // If no name is given, silently fall back to text.
  let type: Type = params.type === undefined ? 'text' as Type : params.type;

  // Only show warning if someone explicity enters a bad name
  if (!type || !DIRECTIVES[type]) {
    console.warn(`Directive type '${type}' does not exist. Falling back to 'text'`);
    type = 'text' as Type;
  }
  params.type = type;

  return new DIRECTIVES[type](key, params, meta) as InstanceType<Directives[Type]>;
}
