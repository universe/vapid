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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const webpack_1 = __importDefault(require("webpack"));
const mkdirp = __importStar(require("mkdirp"));
const Template_1 = require("../../Database/models/Template");
const Renderer_1 = require("../../Renderer");
const utils_1 = require("../../utils");
const webpack_config_1 = __importDefault(require("../../webpack_config"));
const Vapid_1 = __importDefault(require("../Vapid"));
/**
 * This is the Vapid static site builder.
 * The `VapidBuilder` class extends the base `Vapid` project class
 * to enable static site builds. Its single method, `build(dest)`
 * will output compiled static HTML files and static assets
 * for every page and record.
 */
class VapidBuilder extends Vapid_1.default {
    /**
     * Runs a static build of the Vapid site and builds to the `dest` directory.
     * and registers callbacks
     * TODO: Handle favicons.
     *
     * @param {string}  dest – the build destination directory.
     */
    build(dest) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!path.isAbsolute(dest)) {
                throw new Error('Vapid build must be called with an absolute destination path.');
            }
            // Fetch our webpack config.
            const webpackConfig = webpack_config_1.default(this.isDev ? 'development' : 'production', [this.paths.www], [this.paths.modules]);
            // Ensure we have a destination directory and point webpack to it.
            mkdirp.sync(dest);
            webpackConfig.output.path = dest;
            // Run the webpack build for CSS and JS bundles.
            utils_1.Logger.info('Running Webpack Build');
            const stats = yield new Promise((resolve, reject) => {
                webpack_1.default(webpackConfig, (err, dat) => {
                    if (err)
                        reject(err);
                    else
                        resolve(dat);
                });
            });
            // Move all uploads to dest directory.
            utils_1.Logger.info('Moving Uploads Directory');
            const uploadsOut = path.join(dest, 'uploads');
            const uploads = new glob_1.GlobSync(path.join(this.paths.uploads, '**/*'));
            mkdirp.sync(uploadsOut);
            // Move all assets in /uploads to dest uploads directory
            /* eslint-disable-next-line no-restricted-syntax */
            for (const upload of uploads.found) {
                if (!utils_1.Paths.isAssetPath(upload)) {
                    continue;
                }
                fs.copyFileSync(upload, path.join(dest, 'uploads', path.relative(this.paths.uploads, upload)));
            }
            // Copy all public static assets to the dest directory.
            utils_1.Logger.info('Copying Static Assets');
            const assets = new glob_1.GlobSync(path.join(this.paths.www, '**/*'));
            /* eslint-disable-next-line no-restricted-syntax */
            for (const asset of assets.found) {
                const isAsset = utils_1.Paths.isAssetPath(asset);
                if (isAsset === false || typeof isAsset === 'string') {
                    continue;
                }
                try {
                    utils_1.Paths.assertPublicPath(asset);
                }
                catch (err) {
                    continue;
                }
                const out = path.join(dest, path.relative(this.paths.www, asset));
                mkdirp.sync(path.dirname(out));
                fs.copyFileSync(asset, out);
            }
            // Copy discovered favicon over.
            function findFirst(name, paths = []) {
                for (const p of paths) {
                    const filePath = path.join(p, name);
                    if (fs.existsSync(filePath)) {
                        return filePath;
                    }
                }
                return false;
            }
            const faviconPath = findFirst('favicon.ico', [this.paths.www, utils_1.Paths.getDashboardPaths().assets]);
            if (faviconPath) {
                fs.copyFileSync(faviconPath, path.join(dest, '/favicon.ico'));
            }
            utils_1.Logger.info('Connecting to Database');
            yield this.provider.start();
            // Store all sections in a {["type:name"]: Section} map for easy lookup.
            const templatesArr = yield this.provider.getAllTemplates();
            const templates = {};
            for (const template of templatesArr) {
                templates[Template_1.Template.identifier(template)] = template;
            }
            // Fetch all potential template files. These are validated below before compilation.
            utils_1.Logger.info('Compiling All Templates');
            // const htmlFile = await glob(path.join(this.paths.www, '**/*.html'));
            // For every record, in every template...
            /* eslint-disable no-await-in-loop */
            for (const template of templatesArr) {
                if (!template.hasView) {
                    continue;
                }
                const records = yield this.provider.getRecordsByTemplateId(template.id);
                for (const record of records) {
                    utils_1.Logger.extra([`Rendering: ${record.permalink()}`]);
                    yield this.renderUrl(dest, record.permalink());
                    utils_1.Logger.extra([`Created: ${record.permalink()}`]);
                }
            }
            utils_1.Logger.info('Static Site Created!');
            return stats;
        });
    }
    renderUrl(out, url) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = yield Renderer_1.renderContent.call(this, url);
            const selfDir = path.join(out, url);
            mkdirp.sync(path.dirname(selfDir));
            // If an HTML file exists with our parent directory's name, move it in this directory as the index file.
            if (fs.existsSync(`${path.dirname(selfDir)}.html`)) {
                fs.renameSync(`${path.dirname(selfDir)}.html`, `${path.dirname(selfDir)}/index.html`);
            }
            // If a directory already exists here with this HTML file's name, create the index file.
            if (fs.existsSync(selfDir) && fs.statSync(selfDir).isDirectory) {
                fs.writeFileSync(`${selfDir}/index.html`, body);
            }
            // Otherwise, create the HTML file.
            else {
                fs.writeFileSync(`${selfDir}.html`, body);
            }
        });
    }
}
exports.default = VapidBuilder;
//# sourceMappingURL=index.js.map