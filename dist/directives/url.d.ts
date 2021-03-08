import { BaseDirective } from './base';
export default class UrlDirective extends BaseDirective {
    options: {
        default: string;
        label: string;
        help: string;
        priority: number;
        prefix: string;
    };
    attrs: {
        placeholder: string;
        required: boolean;
    };
    input(name: string, value?: string): string;
}
