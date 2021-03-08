"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Handlebars = __importStar(require("handlebars"));
const util_1 = require("@universe/util");
const CollateHelper = {
    isField: false,
    isBranch: false,
    getType() { return 'collate'; },
    blockParam() { return undefined; },
    run(collection, options) {
        const values = new Set();
        let out = '';
        const prop = (options.hash || {}).key;
        if (!prop) {
            throw new Error('You must provide a key to the `{{collate}}` helper.');
        }
        for (const record of collection) {
            let value = typeof record[prop] === 'function' ? record[prop]() : record[prop];
            if (!Array.isArray(value)) {
                value = value ? [value] : [];
            }
            if (!value.length && options.hash.default) {
                values.add(undefined);
            }
            for (let v of value) {
                if (v instanceof Handlebars.SafeString) {
                    v = v.toString();
                }
                values.add(v);
            }
        }
        for (const value of values) {
            const context = {
                blockParams: [{
                        value,
                        name: value || options.hash.default,
                        slug: value ? util_1.toKebabCase(`${value}`) : util_1.toKebabCase(options.hash.default),
                    }],
            };
            out += options.fn(this, context);
        }
        return out;
    }
};
exports.default = CollateHelper;
//# sourceMappingURL=CollateHelper.js.map