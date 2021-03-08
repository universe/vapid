import * as fs from 'fs';
import ejs from 'ejs';
import { extname, join, dirname } from 'path';
import * as mkdirp from 'mkdirp';

/**
 * Helper functions, mostly an extension of Lodash
 */
const Utils = {

  /**
   * Copy a single file
   * and render variables via EJS
   *
   * @param {string} from - the originating path, where to copy from
   * @param {string} to - the destination path, where to copy to
   * @param {Object} data - replacement data for EJS render
   */
  copyFile(from: string, to: string, data = {}) {
    // TODO: Should be smarter about how it determines encoding
    let content = fs.readFileSync(from, 'utf-8');
    let toPath = to;

    mkdirp.sync(dirname(to));

    if (extname(from) === '.ejs') {
      toPath = to.replace(/\.ejs$/, '');
      content = ejs.render(content, data, { async: false }) as string;
    }

    fs.writeFileSync(toPath, content, 'utf-8');
  },

  /**
   * Recursively copy files from one directory to another,
   * and render variables via EJS
   *
   * @param {string} from - the originating path, where to copy from
   * @param {string} to - the destination path, where to copy to
   * @param {Object} data - replacement data for EJS render
   */
  copyFiles(from: string, to: string, data = {}) {
    const filesToCopy = fs.readdirSync(from);

    mkdirp.sync(to);

    filesToCopy.forEach((file) => {
      const toPath = `${to}/${file}`;
      const fromPath = `${from}/${file}`;
      const stats = fs.statSync(fromPath);

      if (stats.isFile()) {
        this.copyFile(fromPath, toPath, data);
      } else if (stats.isDirectory()) {
        this.copyFiles(fromPath, toPath, data);
      }
    });
  },

  /**
   * Recursively remove a path
   *
   * @param {string} path
   */
  removeFiles(path: string) {
    fs.readdirSync(path).forEach((file) => {
      const filePath = join(path, file);

      if (fs.lstatSync(filePath).isDirectory()) {
        this.removeFiles(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });

    fs.rmdirSync(path);
  },
};

export default Utils;