import { Template } from '@neutrino/core';
import { Vapid } from '@neutrino/runner';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';
import pino from 'pino';

const logger = pino();

const PRIVATE_FILE_PREFIXES = new Set([ '_', '.' ]);

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
    const webpackConfig: any = {};
    // makeWebpackConfig(
    //   this.env,
    //   [this.paths.static],
    //   [this.paths.modules],
    // );

    // Ensure we have a destination directory and point webpack to it.
    fs.mkdirSync(dest, { recursive: true });
    webpackConfig.output.path = dest;

    // Run the webpack build for CSS and JS bundles.
    logger.info('Running Webpack Build');
    const stats = await new Promise((resolve) => {
      // webpack(webpackConfig as webpack.Configuration, (err: Error, dat: any) => {
      //   if (err) reject(err);
      //   else resolve(dat);
      // });
      resolve({});
    });

    // Copy all public static assets to the dest directory.
    logger.info('Copying Static Assets');
    const assets = glob.sync(path.join(this.paths.static, '**/*'));
    /* eslint-disable-next-line no-restricted-syntax */
    for (const asset of assets) {
      // Ignore private files.
      logger.info(`${asset} => ${fs.statSync(asset).isDirectory()} || ${PRIVATE_FILE_PREFIXES.has(path.basename(asset)[0])}`);
      if (fs.statSync(asset).isDirectory() || PRIVATE_FILE_PREFIXES.has(path.basename(asset)[0])) { continue; }
      const out = path.join(dest, 'static', path.relative(this.paths.static, asset));
      logger.info(`${asset} => ${out}`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
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

    const faviconPath = findFirst('favicon.ico', [ this.paths.static, path.join(this.paths.static, 'images') ]);
    if (faviconPath) {
      fs.copyFileSync(faviconPath, path.join(dest, '/favicon.ico'));
    }

    logger.info('Connecting to Database');
    await this.database.start();

    // Store all sections in a {["name-type"]: Section} map for easy lookup.
    const templatesArr = await this.database.getAllTemplates();
    const templates = {};
    for (const template of templatesArr) {
      templates[Template.id(template)] = template;
    }

    // Fetch all potential template files. These are validated below before compilation.
    logger.info('Compiling All Templates');
    // const htmlFile = await glob(path.join(this.paths.www, '**/*.html'));

    // For every record, in every template...
    /* eslint-disable no-await-in-loop */
    for (const template of templatesArr) {
      const tmpl = new Template(template);
      if (!tmpl.hasView()) { continue; }
      const records = await this.database.getRecordsByTemplateId(tmpl.id);
      for (const record of records) {
        const rec = await this.database.hydrateRecord(record);
        const permalink = rec.permalink();
        logger.info([`Rendering: "${permalink}"`]);
        try {
          await this.renderUrl(dest, permalink);
          logger.info([`Rendered: "${permalink}"`]);
        }
 catch (err) {
          console.error(err);
          logger.error([`Error Rendering: "${permalink}"`]);
        }
      }
    }

    logger.info('Static Site Created!');

    return stats;
  }

  async renderUrl(out: string, url: string) {
    const body = await this.renderPermalink(this, url);
    const selfDir = path.join(out, url);
    fs.mkdirSync(path.dirname(selfDir), { recursive: true });

    // If an HTML file exists with our parent directory's name, move it in this directory as the index file.
    if (fs.existsSync(`${path.dirname(selfDir)}.html`)) {
      fs.renameSync(`${path.dirname(selfDir)}.html`, `${path.dirname(selfDir)}/index.html`);
    }

    // If a directory already exists here with this HTML file's name, create the index file.
    if (fs.existsSync(selfDir) && fs.statSync(selfDir).isDirectory()) {
      fs.writeFileSync(`${selfDir}/index.html`, body);
    }

    // Otherwise, create the HTML file.
    else {
      fs.writeFileSync(`${selfDir}.html`, body);
    }
  }
}
