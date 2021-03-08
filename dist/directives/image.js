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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const image_size_1 = require("image-size");
const base_1 = require("./base");
class ImageDirective extends base_1.BaseDirective {
    constructor() {
        super(...arguments);
        this.options = {
            default: {
                src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                type: "gif" /* GIF */,
                width: 1,
                height: 1,
                aspectRatio: 1,
            },
            label: '',
            help: '',
            priority: 0,
        };
        this.attrs = {
            required: false,
            placeholder: ''
        };
    }
    /**
     * Renders inputs necessary to upload, preview, and optionally remove images
     *
     * @param {string} name
     * @param {string} [value=this.options.default]
     * @return {string} rendered HTML
     *
     * eslint-disable class-methods-use-this
     */
    input(name, value = this.options.default) {
        const inputs = `<input type="file" name="${name}" accept="image/*" >
                  <input type="hidden" name="${name}" value="${value}">`;
        const src = value ? `/uploads/${value}` : '';
        const preview = `<img class="preview" src="${src}" id="${name}">`;
        const destroyName = name.replace('content', '_destroy');
        const destroy = !this.attrs.required
            ? `<div class="ui checkbox">
            <input type="checkbox" name="${destroyName}" id="${destroyName}">
            <label for="${destroyName}">Remove</label>
          </div>`
            : '';
        return `
      <div class="previewable">
        ${inputs}
        ${preview}
        ${destroy}
        <button id="edit-image-button" data-name="${name}">Edit</button>
      </div>`;
    }
    /**
     * Renders <img> tag or raw src
     */
    render(value) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const src = ((_a = value.src) === null || _a === void 0 ? void 0 : _a.indexOf('data:')) === -1
                ? `/uploads/${value.src}`
                : value.src;
            const onDisk = value.src ? path.join(process.cwd(), 'data/uploads', value.src) : null;
            const size = (onDisk && fs.existsSync(onDisk) && image_size_1.imageSize(onDisk)) || { width: 1, height: 1, type: 'gif' };
            return {
                src,
                width: size.width,
                height: size.height,
                type: size.type,
                aspectRatio: (size.height && size.width) ? (size.height / size.width) : 1,
                toString() { return src; }
            };
        });
    }
    /**
     * A preview of the image
     *
     * @param {string} fileName
     * @return {string}
     */
    preview(value) {
        var _a;
        const src = ((_a = value.src) === null || _a === void 0 ? void 0 : _a.indexOf('data:')) === -1
            ? `/uploads/${value.src}`
            : value.src;
        return `<img src="${src}" />`;
    }
}
exports.default = ImageDirective;
//# sourceMappingURL=image.js.map