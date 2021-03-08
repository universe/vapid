import { BaseDirective } from './base';
export default class NumberDirective extends BaseDirective<number> {
    options: {
        default: number;
        label: string;
        help: string;
        priority: number;
        range: boolean;
    };
    attrs: {
        placeholder: string;
        required: boolean;
        min: number;
        max: number;
        step: number;
    };
    serialize(value: number): number;
    /**
     * Renders either a number
     */
    input(name: string, value?: number): string;
}
