"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const IfHelper_1 = __importDefault(require("./IfHelper"));
const UnlessHelper = {
    isField: false,
    isBranch: false,
    getType() { return null; },
    run(input, ...args) {
        let condition = input;
        if (`${condition}`.startsWith('data:')) {
            condition = false;
        }
        return IfHelper_1.default.run.call(this, !condition, ...args);
    },
    blockParam() { return undefined; }
};
exports.default = UnlessHelper;
//# sourceMappingURL=UnlessHelper.js.map