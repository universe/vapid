"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ImageHelper = {
    isField: true,
    isBranch: false,
    getType() { return 'image'; },
    run([image], _hash, options) {
        var _a;
        if (!image) {
            return options.inverse ? options.inverse() : '';
        }
        return image ? (_a = options.block) === null || _a === void 0 ? void 0 : _a.call(options, [image]) : '';
    },
};
exports.default = ImageHelper;
//# sourceMappingURL=ImageHelper.js.map