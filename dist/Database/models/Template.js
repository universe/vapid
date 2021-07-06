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
exports.Template = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("@universe/util");
const pluralize = __importStar(require("pluralize"));
class Template {
    constructor(data) {
        this.id = 0;
        this.name = data.name;
        this.sortable = data.sortable;
        this.options = data.options;
        this.fields = data.fields;
        this.type = data.type;
    }
    static identifier(template) {
        return `${template.type}:${template.name}`.toLowerCase();
    }
    /**
     * Generates a user-friendly label
     * Allows template to override default behavior
     *
     * @return {string}
     */
    label() {
        if (this.type === 'page' && this.name === 'index') {
            return 'Home';
        }
        return this.options.label || util_1.toTitleCase(this.name);
    }
    /**
     * Singularized label
     *
     * @return {string}
     */
    labelSingular() {
        return pluralize.singular(this.label());
    }
    /**
     * Singularized type
     *
     * @return {string}
     */
    typeSingular() {
        return pluralize.singular(this.type);
    }
    /**
     * Table column
     * Primarily used by dashboard index page
     *
     * @return {array} first three fields
     */
    tableColumns() {
        return Object.keys(this.fields).sort((key1, key2) => {
            const val1 = this.fields[key1];
            const val2 = this.fields[key2];
            if (((val1 === null || val1 === void 0 ? void 0 : val1.priority) || Infinity) > ((val2 === null || val2 === void 0 ? void 0 : val2.priority) || Infinity)) {
                return 1;
            }
            if (((val1 === null || val1 === void 0 ? void 0 : val1.priority) || Infinity) < ((val2 === null || val2 === void 0 ? void 0 : val2.priority) || Infinity)) {
                return -1;
            }
            if (key1 === 'title' || key1 === 'name') {
                return -1;
            }
            if (key2 === 'title' || key2 === 'name') {
                return 1;
            }
            if (key1 === key2) {
                return 0;
            }
            return key1 > key2 ? 1 : -1;
        }).slice(0, 4);
    }
    /**
     * User-friendly headers for table columns
     *
     * @return {array}
     */
    tableColumnsHeaders() {
        return this.tableColumns().map(key => { var _a; return ((_a = this.fields[key]) === null || _a === void 0 ? void 0 : _a.label) || util_1.toTitleCase(key); });
    }
    /**
     * Quick way to check if Template has any fields
     *
     * @return {boolean}
     */
    hasFields() {
        return Object.keys(this.fields).length > 0;
    }
    /**
     * Sort fields by priority
     *
     * @return {array}
     */
    sortedFields() {
        return Object.entries(this.fields)
            .reduce((result, [key, value]) => [...result, Object.assign(Object.assign({}, value), { _name: key })], [])
            .sort((a, b) => (parseInt(`${a.priority}`, 10) < parseInt(`${b.priority}`, 10) ? -1 : 1));
    }
    isCollection() { return this.type === 'collection'; }
    hasCollection() { fs.existsSync(path.join(process.env.TEMPLATES_PATH, 'collections', `${this.name}.html`)); }
    isPage() { return this.type === 'page'; }
    hasPage() { return fs.existsSync(path.join(process.env.TEMPLATES_PATH, `${this.name}.html`)); }
    /**
     * If this template has a backing view to render a dedicated page.
     *
     * @return {boolean}
     */
    hasView() {
        if (this.type === 'page') {
            return fs.existsSync(path.join(process.env.TEMPLATES_PATH, `${this.name}.html`));
        }
        if (this.type === 'collection') {
            return fs.existsSync(path.join(process.env.TEMPLATES_PATH, 'collections', `${this.name}.html`));
        }
        return false;
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            sortable: this.sortable,
            options: this.options,
            fields: this.fields,
            type: this.type,
            label: this.label(),
            labelSingular: this.labelSingular(),
            typeSingular: this.typeSingular(),
            tableColumns: this.tableColumns(),
            tableColumnsHeaders: this.tableColumnsHeaders(),
            hasFields: this.hasFields(),
            sortedFields: this.sortedFields(),
            isCollection: this.isCollection(),
            hasCollection: this.hasCollection(),
            isPage: this.isPage(),
            hasPage: this.hasPage(),
            hasView: this.hasView(),
        };
    }
}
exports.Template = Template;
//# sourceMappingURL=Template.js.map