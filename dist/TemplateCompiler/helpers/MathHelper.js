"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eq = {
    div: (a, b) => a / b,
    mult: (a, b) => a * b,
    mod: (a, b) => a % b,
    sum: (a, b) => a + b,
    minus: (a, b) => a - b,
    min: (a, b) => Math.min(a, b),
    max: (a, b) => Math.max(a, b),
    ceil: (a) => Math.ceil(a),
    floor: (a) => Math.floor(a),
};
const MathHelper = {
    isField: false,
    isBranch: false,
    getType() { return 'math'; },
    run(method, a, b) {
        return `${eq[method](a, b)}`;
    },
    blockParam() { return undefined; }
};
exports.default = MathHelper;
//# sourceMappingURL=MathHelper.js.map