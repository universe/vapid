"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const util_1 = require("@universe/util");
const CollateHelper = {
    isField: false,
    isBranch: "collection" /* COLLECTION */,
    getType() { return 'collate'; },
    run([collection], hash = {}, options) {
        var _a;
        const values = new Set();
        let out = '';
        const prop = hash.key;
        if (!prop) {
            throw new Error('You must provide a key to the `{{collate}}` helper.');
        }
        for (const record of collection) {
            let value = typeof record[prop] === 'function' ? record[prop]() : record[prop];
            if (!Array.isArray(value)) {
                value = value ? [value] : [];
            }
            if (!value.length && hash.default) {
                values.add(undefined);
            }
            for (let v of value) {
                if (v instanceof types_1.SafeString) {
                    v = v.toString();
                }
                values.add(v);
            }
        }
        for (const value of values) {
            out += (_a = options.block) === null || _a === void 0 ? void 0 : _a.call(options, [{
                    value,
                    name: value || hash.default,
                    slug: value ? util_1.toKebabCase(`${value}`) : util_1.toKebabCase(hash.default),
                }]);
        }
        return out;
    }
};
exports.default = CollateHelper;
//# sourceMappingURL=CollateHelper.js.map