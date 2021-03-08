import { BaseDirective, DirectiveAttrs } from './base';
interface TextDirectiveAttrs extends DirectiveAttrs {
    maxlength?: number;
}
export default class TextDirective extends BaseDirective {
    options: {
        default: string;
        label: string;
        help: string;
        priority: number;
        long: boolean;
    };
    attrs: TextDirectiveAttrs;
    /**
     * Renders either a text or textarea input
     */
    input(name: string, value?: string): string;
}
export {};
