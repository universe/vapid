"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SectionHelper = {
    isField: false,
    isBranch: false,
    getType(leaf) { return leaf.hash.multiple ? "collection" /* COLLECTION */ : "settings" /* SETTINGS */; },
    run(data = [], options) {
        let out = '';
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
            out += options.fn(item, { data: options.data });
        }
        return out;
    },
    blockParam(idx, node) {
        if (idx > 0) {
            return undefined;
        }
        return {
            name: node.params[0].original,
            type: "settings" /* SETTINGS */,
            isPrivate: !!node.params[0].data,
        };
    }
};
exports.default = SectionHelper;
//# sourceMappingURL=SectionHelper.js.map