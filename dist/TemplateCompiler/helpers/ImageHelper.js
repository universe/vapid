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
const directives = __importStar(require("../../directives"));
const LinkHelper = {
    getType() { return 'image'; },
    run(value, options) {
        const image = directives.get('image').normalize((typeof value === 'function') ? value() : value);
        const context = { blockParams: [image] };
        // if (!image.url || !link.name) { return options.inverse ? options.inverse(this) : ''; }
        return image ? options.fn(this, context) : '';
    },
    isField: false,
    isBranch: false,
    blockParam() { return undefined; },
};
exports.default = LinkHelper;
//# sourceMappingURL=ImageHelper.js.map