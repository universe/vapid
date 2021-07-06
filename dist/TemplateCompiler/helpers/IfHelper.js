"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IfHelper = {
    isField: false,
    isBranch: false,
    getType() { return 'if'; },
    run(params, _hash, options) {
        let [condition, ifValue, elseValue] = params;
        if (`${condition}`.startsWith('data:')) {
            condition = false;
        }
        if (!options.block) {
            return condition ? ifValue : elseValue;
        }
        if (condition) {
            return options.block();
        }
        if (options.inverse) {
            return options.inverse();
        }
        return '';
    }
};
exports.default = IfHelper;
//# sourceMappingURL=IfHelper.js.map