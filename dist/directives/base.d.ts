import { Json } from '@universe/util';
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
    required: boolean;
    placeholder: string;
}
export declare type BlockRenderer = Json | {
    toString: () => string;
};
/**
 * The base class that all directives inherit from.
 * These are the crux of Vapid, allowing templates to specify input attributes and render content.
 */
export declare abstract class BaseDirective<DirectiveType = string> {
    options: DirectiveOptions<DirectiveType>;
    attrs: DirectiveAttrs;
    meta: {
        pages: Record[];
    };
    constructor(params?: {}, meta?: {});
    /**
     * Converts attrs object into HTML key=value attributes
     * Typically used by the input method
     */
    htmlAttrs(): string;
    /**
     * Renders an HTML text input
     * Typically used in the dashboard forms, or front-end contact forms
     */
    abstract input(name: string, value: DirectiveType): string;
    preview(value?: DirectiveType): string;
    render(value?: DirectiveType): Promise<string | BlockRenderer>;
    serialize(value?: DirectiveType): DirectiveType;
}
