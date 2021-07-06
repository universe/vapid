"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DateHelper = {
    isField: true,
    isBranch: false,
    getType() { return 'date'; },
    run([value]) {
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