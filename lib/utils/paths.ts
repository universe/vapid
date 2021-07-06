import * as path from 'path';
import { IProvider } from '../Database/providers';
import { PageType } from '../Database/models/Template';
import { Record } from '../Database/models/Record';

const HTML_FILE_EXTS = { '': 1, '.html': 1 };
const SASS_FILE_EXTS = { '.scss': 1, '.sass': 1 };

/**
 * Resolves commonly-used dashboard paths.
 * @return {Object} absolute paths
 */
export function getDashboardPaths() {
  const paths = {
    assets: path.resolve(__dirname, '../../assets'),
    views: path.resolve(__dirname, '../../views'),
  };

  return paths;
};

/**
 * Validates that a given path is a valid asset path. HTML and s[c|a]ss files are excluded.
 * TODO: Its weird that this will return a string for the human readable error. Fix it.
 *
 * @param {string} path
 * @returns {boolean | string} Will return a string if there is a human readable error.
 */
export function isAssetPath(filePath: string) {
  const ext = path.extname(filePath);

  if (HTML_FILE_EXTS[ext] || filePath.match(/.pack\.[js|scss|sass]/)) {
    return false;
  } else if (SASS_FILE_EXTS[ext]) {
    const suggestion = filePath.replace(/\.(scss|sass)$/, '.css');
    return `Sass files cannot be served. Use "${suggestion}" instead.`;
  }

  return true;
};


export async function getRecordFromPath(permalink: string, db: IProvider): Promise<Record | null> {

  // Alias root requests.
  if (permalink.endsWith('/')) { permalink = permalink.slice(0, -1); }
  if (permalink === '' || permalink === '/') { permalink = 'index'; }

  // If we have an exact match, opt for that.
  const record = await db.getRecordBySlug(permalink);
  if (record) { return record; }

  // If a slug doesn't match perfectly, then any slashes in the name might come from a
  // collection specifier. Parse this like a collection record.
  if (permalink.includes('/')) {
    const segments = permalink.split('/');
    const collection = segments.shift();
    const slug = segments.join('/');
    const template = collection ? await db.getTemplateByName(collection, PageType.COLLECTION) : null;
    if (!template) { return null; }

    // Try to get the plain old slug value if it exists.
    const record = await db.getRecordBySlug(`{${template.id}}${slug}`);
    if (record) { return record; }

    // Otherwise, this must be a {template_name}-{record_id} slug. Grab the ID.
    const id = slug.split('-').pop();
    return id ? await db.getRecordById(parseInt(id)) : null;
  }

  // Otherwise, this is a {template_name}-{record_id} slug for a page. Grab the ID.
  const parts = permalink.split('-');
  const id = parts.length > 1 ? parts.pop() : null;
  return id ? await db.getRecordById(parseInt(id, 10)) : null;
};
