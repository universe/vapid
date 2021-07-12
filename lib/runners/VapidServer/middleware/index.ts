import * as path from 'path';

const PRIVATE_FILE_PREFIXES = new Set([ '_', '.' ])

export default {

  // Throw 404 if the path starts with an underscore or period
  privateFiles: async function privateFiles(ctx: any, next: () => Promise<void>) {
    if (PRIVATE_FILE_PREFIXES.has(path.basename(ctx.path)[0])) {
      throw new Error('Filenames starting with an underscore or period are private, and cannot be served.');
    }
    await next();
  },
}
