"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EqHelper = {
    isField: false,
    isBranch: false,
    getType() { return 'eq'; },
    run([value1, value2]) {
        return value1 === value2 ? 'true' : 'false';
    },
};
exports.default = EqHelper;
//# sourceMappingURL=EqHelper.js.map