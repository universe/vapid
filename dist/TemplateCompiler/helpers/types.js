"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeString = void 0;
class SafeString {
    constructor(str) {
        this.str = str;
    }
    toString() {
        return '' + this.str;
    }
}
exports.SafeString = SafeString;
//# sourceMappingURL=types.js.map