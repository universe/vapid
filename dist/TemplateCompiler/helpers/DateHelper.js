"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DateHelper = {
    isField: false,
    isBranch: false,
    getType() { return 'date'; },
    blockParam() { return undefined; },
    run(value) {
        return value ? value.toLocaleString('en-us', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }) : '';
    }
};
exports.default = DateHelper;
//# sourceMappingURL=DateHelper.js.map