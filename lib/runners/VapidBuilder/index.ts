import * as fs from 'fs';
import * as path from 'path';
import { GlobSync } from 'glob';
import webpack from 'webpack';
import * as mkdirp from 'mkdirp';

import { Template } from '../../Database/models/Template';
import { renderContent } from '../../Renderer';
import { Logger, Paths } from '../../utils';
import makeWebpackConfig from '../../webpack_config';
import Vapid from '../Vapid';

/**
 * This is the Vapid static site builder.
 * The `VapidBuilder` class extends the base `Vapid` project class
 * to enable static site builds. Its single method, `build(dest)`
 * will output compiled static HTML files and static assets
 * for every page and record.
 */
export default class VapidBuilder extends Vapid {
  /**
   * Runs a static build of the Vapid site and builds to the `dest` directory.
   * and registers callbacks
   * TODO: Handle favicons.
   *
   * @param {string}  dest – the build destination directory.
   */
  async build(dest: string) {
    if (!path.isAbsolute(dest)) {
      throw new Error('Vapid build must be called with an absolute destination path.');
    }

    // Fetch our webpack config.
    const webpackConfig = makeWebpackConfig(
      this.isDev ? 'development' : 'production',
      [this.paths.www],
      [this.paths.modules],
    );

    // Ensure we have a destination directory and point webpack to it.
    mkdirp.sync(dest);
    webpackConfig.output.path = dest;

    // Run the webpack build for CSS and JS bundles.
    Logger.info('Running Webpack Build');
    const stats = await new Promise((resolve, reject) => {
      webpack(webpackConfig as webpack.Configuration, (err: Error, dat: any) => {
        if (err) reject(err);
        else resolve(dat);
      });
    });

    // Move all uploads to dest directory.
    Logger.info('Moving Uploads Directory');
    const uploadsOut = path.join(dest, 'uploads');
    const uploads = new GlobSync(path.join(this.paths.uploads, '**/*'));
    mkdirp.sync(uploadsOut);

    // Move all assets in /uploads to dest uploads directory
    /* eslint-disable-next-line no-restricted-syntax */
    for (const upload of uploads.found) {
      if (!Paths.isAssetPath(upload)) { continue; }
      fs.copyFileSync(
        upload,
        path.join(dest, 'uploads', path.relative(this.paths.uploads, upload)),
      );
    }

    // Copy all public static assets to the dest directory.
    Logger.info('Copying Static Assets');
    const assets = new GlobSync(path.join(this.paths.www, '**/*'));
    /* eslint-disable-next-line no-restricted-syntax */
    for (const asset of assets.found) {
      const isAsset = Paths.isAssetPath(asset);
      if (isAsset === false || typeof isAsset === 'string') { continue; }
      try { Paths.assertPublicPath(asset); } catch (err) { continue; }
      const out = path.join(dest, path.relative(this.paths.www, asset));
      mkdirp.sync(path.dirname(out));
      fs.copyFileSync(asset, out);
    }

    // Copy discovered favicon over.
    function findFirst(name: string, paths: string[] = []) {
      for (const p of paths) {
        const filePath = path.join(p, name);
        if (fs.existsSync(filePath)) { return filePath; }
      }
      return false;
    }

    const faviconPath = findFirst('favicon.ico', [this.paths.www, Paths.getDashboardPaths().assets]);
    if (faviconPath) {
      fs.copyFileSync(faviconPath, path.join(dest, '/favicon.ico'));
    }

    Logger.info('Connecting to Database');
    await this.provider.start();

    // Store all sections in a {["type:name"]: Section} map for easy lookup.
    const templatesArr = await this.provider.getAllTemplates();
    const templates = {};
    for (const template of templatesArr) {
      templates[Template.identifier(template)] = template;
    }

    // Fetch all potential template files. These are validated below before compilation.
    Logger.info('Compiling All Templates');
    // const htmlFile = await glob(path.join(this.paths.www, '**/*.html'));

    // For every record, in every template...
    /* eslint-disable no-await-in-loop */
    for (const template of templatesArr) {
      if (!template.hasView) { continue; }
      const records = await this.provider.getRecordsByTemplateId(template.id);
      for (const record of records) {
        Logger.extra([`Rendering: ${record.permalink()}`]);
        await this.renderUrl(dest, record.permalink());
        Logger.extra([`Created: ${record.permalink()}`]);
      }
    }

    Logger.info('Static Site Created!');

    return stats;
  }

  async renderUrl(out: string, url: string) {
    const body = await renderContent.call(this, url);
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
  }
}
