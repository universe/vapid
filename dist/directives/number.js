"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class NumberDirective extends base_1.BaseDirective {
    constructor() {
        super(...arguments);
        this.options = {
            default: 0,
            label: '',
            help: '',
            priority: 0,
            range: false,
        };
        this.attrs = {
            placeholder: '',
            required: false,
            min: 0,
            max: Infinity,
            step: 1,
        };
    }
    serialize(value) {
        return Number(value);
    }
    /**
     * Renders either a number
     */
    input(name, value = this.options.default) {
        const type = this.options.range ? 'range' : 'number';
        const label = this.options.range ? `<div class="ui left pointing basic label">${value || '—'}</div>` : '';
        return `<input type="${type}" name="${name}" value="${value}" ${this.htmlAttrs()}>${label}`;
    }
}
exports.default = NumberDirective;
//# sourceMappingURL=number.js.map