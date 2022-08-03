import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOOP_FILE = `file://${path.join(__dirname, 'noop.js')}`;

export async function resolve(specifier: string, parentModuleURL: any, defaultResolver: any) {
  return specifier.endsWith('.css')
    ? { url: NOOP_FILE, format: 'module' }
    : defaultResolver(specifier, parentModuleURL, defaultResolver);
}