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
const directives = __importStar(require("./directives"));
const util_1 = require("@universe/util");
/**
 * Renders forms for the dashboard.
 */
class Form {
    static field(name, label, params, value, error, meta) {
        const directive = directives.find(params, meta);
        const requiredClass = (directive.attrs.required && !params.default) ? 'required ' : '';
        const errorClass = error ? 'error ' : '';
        const errorMessage = error ? `<small class="error-message" aria-role="alert">${error}</small>` : '';
        const help = params.help ? `<small id="help-${name}" class="help">${params.help}</small>` : '';
        if (params.help) {
            directive.attrs['aria-describedby'] = `help-${name}`;
        }
        // @ts-ignore
        const input = directive.input(name, value);
        return `
      <div class="${requiredClass}${errorClass}field field__${params.type || 'text'}">
        <label for="${name}">
          ${params.label || util_1.toTitleCase(label)}
          ${help}
        </label>
        ${input}
        ${errorMessage}
      </div>`;
    }
}
exports.default = Form;
//# sourceMappingURL=form.js.map