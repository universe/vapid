import Handlebars from 'handlebars';
import TextDirective from './text';
import UrlDirective from './url';
import NumberDirective from './number';
import LinkDirective from './link';
import ImageDirective from './image';
declare const DIRECTIVES: {
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
export declare function helper(value: any, attrs: Record<string, string>, meta: Record<string, string>): () => Promise<string | import("./base").BlockRenderer> | Handlebars.SafeString;
export declare function get(name: string): any;
export {};
