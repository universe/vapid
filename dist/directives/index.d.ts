import ChoiceDirective from './choice';
import ColorDirective from './color';
import DateDirective from './date';
import HtmlDirective from './html';
import ImageDirective from './image';
import LinkDirective from './link';
import NumberDirective from './number';
import TextDirective from './text';
import UrlDirective from './url';
declare const DIRECTIVES: {
    readonly choice: typeof ChoiceDirective;
    readonly color: typeof ColorDirective;
    readonly date: typeof DateDirective;
    readonly html: typeof HtmlDirective;
    readonly text: typeof TextDirective;
    readonly url: typeof UrlDirective;
    readonly number: typeof NumberDirective;
    readonly link: typeof LinkDirective;
    readonly image: typeof ImageDirective;
};
/**
 * Lookup function for available directives. Return a new instance if found.
 * Falls back to "text" directive if one can't be found.
 *
 * @params {Object} params - options and attributes
 * @return {Directive} - an directive instance
 */
declare type Directives = typeof DIRECTIVES;
export declare function find(params?: {
    type?: string;
}, meta?: {}): InstanceType<Directives[keyof Directives]>;
export declare function helper(value: any, attrs: Record<string, string>, meta: Record<string, string>): Promise<() => any>;
export {};
