import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { dirname, basename, resolve, extname } from 'path';
import * as mkdirp from 'mkdirp';
import * as ejs from 'ejs';
import findUp from 'find-up';

const TEMPLATE_DIR = findUp.sync('site_template', { type: 'directory', cwd: __dirname });

/**
 * Creates new site directories from a template
 */

/**
 * Copy a single file
 * and render variables via EJS
 *
 * @param {string} from - the originating path, where to copy from
 * @param {string} to - the destination path, where to copy to
 * @param {Object} data - replacement data for EJS render
 */
  export function copyFile(from: string, to: string, data = {}) {
  // TODO: Should be smarter about how it determines encoding
  let content = fs.readFileSync(from, 'utf-8');
  let toPath = to;

  mkdirp.sync(dirname(to));

  if (extname(from) === '.ejs') {
    toPath = to.replace(/\.ejs$/, '');
    content = ejs.render(content, data, { async: false }) as string;
  }

  fs.writeFileSync(toPath, content, 'utf-8');
}

/**
 * Recursively copy files from one directory to another,
 * and render variables via EJS
 *
 * @param {string} from - the originating path, where to copy from
 * @param {string} to - the destination path, where to copy to
 * @param {Object} data - replacement data for EJS render
 */
export function copyFiles(from: string, to: string, data = {}) {
  const filesToCopy = fs.readdirSync(from);

  mkdirp.sync(to);

  filesToCopy.forEach((file) => {
    const toPath = `${to}/${file}`;
    const fromPath = `${from}/${file}`;
    const stats = fs.statSync(fromPath);

    if (stats.isFile()) {
      copyFile(fromPath, toPath, data);
    } else if (stats.isDirectory()) {
      copyFiles(fromPath, toPath, data);
    }
  });
}

/*
  *
  * Copies files for a new website
  *
  * @param {string} target - a file path
  */
export function copyTo(target: string) {
  if (!TEMPLATE_DIR) { throw new Error('Unable to find site template directory.') };
  if (fs.existsSync(target)) {
    throw new Error('Target directory already exists.');
  }

  const pjson = JSON.parse(fs.readFileSync('../package.json', 'utf-8'));

  copyFiles(TEMPLATE_DIR, target, {
    name: basename(target),
    package: pjson.name,
    version: pjson.version,
    secretKey: randomBytes(64).toString('hex'),
  });
}

/**
 * Regenerates .env file
 *
 * @param {string} target - a file path
 */
export function copyEnv(target: string) {
  if (!TEMPLATE_DIR) { throw new Error('Unable to find site template directory.') };
  const targetFile = resolve(target, '.env');
  const templateFile = resolve(TEMPLATE_DIR, '.env.ejs');

  if (fs.existsSync(targetFile)) return;

  copyFile(templateFile, targetFile, {
    secretKey: randomBytes(64).toString('hex'),
  });
}
