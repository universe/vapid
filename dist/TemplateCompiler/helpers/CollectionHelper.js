"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const CollectionHelper = {
    isField: false,
    isBranch: "collection" /* COLLECTION */,
    getType() { return 'collection'; },
    run(data, options) {
        const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
        const limit = (options.hash && options.hash.limit) || Infinity;
        // If collection is empty, and the helper provides an empty state, render the empty state.
        if (items.length === 0 && options.inverse)
            return options.inverse(this) || '';
        // Otherwise, render each item!
        let out = '';
        let index = 0;
        for (const item of items) {
            if (index >= limit) {
                break;
            }
            out += options.fn(this, {
                data: {
                    index,
                    length: items.length,
                    first: index === 0,
                    last: index === items.length - 1,
                    next: items[index + 1],
                    prev: items[index - 1],
                    record: item[constants_1.DATA_SYMBOL],
                },
                blockParams: [item],
            });
            index += 1;
        }
        return out;
    },
    blockParam(idx, node) {
        if (idx > 0) {
            return undefined;
        }
        return {
            name: node.params[0].original,
            type: "collection" /* COLLECTION */,
            isPrivate: !!node.params[0].data,
        };
    }
};
exports.default = CollectionHelper;
//# sourceMappingURL=CollectionHelper.js.map