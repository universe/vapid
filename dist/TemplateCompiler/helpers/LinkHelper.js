"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LinkHelper = {
    isField: true,
    isBranch: false,
    getType() { return 'link'; },
    run([link], _hash, options) {
        var _a;
        if (!link || !link.url || !link.name) {
            return options.inverse ? options.inverse() : '';
        }
        return link ? (_a = options.block) === null || _a === void 0 ? void 0 : _a.call(options, [link]) : '';
    },
};
exports.default = LinkHelper;
//# sourceMappingURL=LinkHelper.js.map