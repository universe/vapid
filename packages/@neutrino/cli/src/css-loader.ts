import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOOP_FILE = `file://${path.join(__dirname, 'noop.js')}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolve(specifier: string, parentModuleURL: string, defaultResolver: any) {
  return specifier.endsWith('.css')
    ? { url: NOOP_FILE, format: 'module', shortCircuit: true }
    : defaultResolver(specifier, parentModuleURL, defaultResolver);
}
