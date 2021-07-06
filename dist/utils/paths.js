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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecordFromPath = exports.isAssetPath = exports.getDashboardPaths = void 0;
const path = __importStar(require("path"));
const HTML_FILE_EXTS = { '': 1, '.html': 1 };
const SASS_FILE_EXTS = { '.scss': 1, '.sass': 1 };
/**
 * Resolves commonly-used dashboard paths.
 * @return {Object} absolute paths
 */
function getDashboardPaths() {
    const paths = {
        assets: path.resolve(__dirname, '../../assets'),
        views: path.resolve(__dirname, '../../views'),
    };
    return paths;
}
exports.getDashboardPaths = getDashboardPaths;
;
/**
 * Validates that a given path is a valid asset path. HTML and s[c|a]ss files are excluded.
 * TODO: Its weird that this will return a string for the human readable error. Fix it.
 *
 * @param {string} path
 * @returns {boolean | string} Will return a string if there is a human readable error.
 */
function isAssetPath(filePath) {
    const ext = path.extname(filePath);
    if (HTML_FILE_EXTS[ext] || filePath.match(/.pack\.[js|scss|sass]/)) {
        return false;
    }
    else if (SASS_FILE_EXTS[ext]) {
        const suggestion = filePath.replace(/\.(scss|sass)$/, '.css');
        return `Sass files cannot be served. Use "${suggestion}" instead.`;
    }
    return true;
}
exports.isAssetPath = isAssetPath;
;
function getRecordFromPath(permalink, db) {
    return __awaiter(this, void 0, void 0, function* () {
        // Alias root requests.
        if (permalink.endsWith('/')) {
            permalink = permalink.slice(0, -1);
        }
        if (permalink === '' || permalink === '/') {
            permalink = 'index';
        }
        // If we have an exact match, opt for that.
        const record = yield db.getRecordBySlug(permalink);
        if (record) {
            return record;
        }
        // If a slug doesn't match perfectly, then any slashes in the name might come from a
        // collection specifier. Parse this like a collection record.
        if (permalink.includes('/')) {
            const segments = permalink.split('/');
            const collection = segments.shift();
            const slug = segments.join('/');
            const template = collection ? yield db.getTemplateByName(collection, "collection" /* COLLECTION */) : null;
            if (!template) {
                return null;
            }
            // Try to get the plain old slug value if it exists.
            const record = yield db.getRecordBySlug(`{${template.id}}${slug}`);
            if (record) {
                return record;
            }
            // Otherwise, this must be a {template_name}-{record_id} slug. Grab the ID.
            const id = slug.split('-').pop();
            return id ? yield db.getRecordById(parseInt(id)) : null;
        }
        // Otherwise, this is a {template_name}-{record_id} slug for a page. Grab the ID.
        const parts = permalink.split('-');
        const id = parts.length > 1 ? parts.pop() : null;
        return id ? yield db.getRecordById(parseInt(id, 10)) : null;
    });
}
exports.getRecordFromPath = getRecordFromPath;
;
//# sourceMappingURL=paths.js.map