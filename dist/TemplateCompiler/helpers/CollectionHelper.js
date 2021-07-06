"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const CollectionHelper = {
    isField: false,
    isBranch: "collection" /* COLLECTION */,
    getType() { return 'collection'; },
    run([data], hash = {}, options) {
        var _a, _b;
        const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
        const limit = hash.limit || Infinity;
        // If collection is empty, and the helper provides an empty state, render the empty state.
        if (items.length === 0)
            return ((_a = options.inverse) === null || _a === void 0 ? void 0 : _a.call(options)) || '';
        // Otherwise, render each item!
        let out = '';
        let index = 0;
        for (const item of items) {
            if (index >= limit) {
                break;
            }
            out += (_b = options.block) === null || _b === void 0 ? void 0 : _b.call(options, [item], {
                index,
                length: items.length,
                first: index === 0,
                last: index === items.length - 1,
                next: items[index + 1],
                prev: items[index - 1],
                record: item[types_1.DATA_SYMBOL],
            });
            index += 1;
        }
        return out;
    },
};
exports.default = CollectionHelper;
//# sourceMappingURL=CollectionHelper.js.map