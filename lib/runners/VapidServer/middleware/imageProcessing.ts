import Koa from 'koa';
import * as crypto from 'crypto';
import {
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';

import { extname, join } from 'path';

const ACCEPTED_FORMATS = {
  '.jpg': 1,
  '.jpeg': 1,
  '.png': 1,
  '.webp': 1,
};

/**
 * Resize and crop images
 *
 * @params {Object} paths
 * @return {function}
 */
export default function imageProcessing(paths: { data: string; www: string; cache: string}) {
  return async (ctx: Koa.Context, next: () => void) => {
    const ext = extname(ctx.path).toLowerCase();
    const { w, h } = ctx.query;

    if (
      !ACCEPTED_FORMATS[ext] ||
      !(w || h)
    ) return next();

    const filePath = ctx.path.startsWith('/uploads') ?
      join(paths.data, ctx.path) :
      join(paths.www, ctx.path);
    const fileStats = statSync(filePath);
    const cacheKey = crypto.createHash('md5')
      .update(`${ctx.url}${fileStats.mtime}`)
      .digest('hex');
    const cachePath = join(paths.cache, `${cacheKey}${ext}`);
    const cacheExists = existsSync(cachePath);

    ctx.set('Content-Length', `${fileStats.size}`);
    ctx.type = ext;

    ctx.body = await (async () => {
      if (cacheExists) {
        return readFileSync(cachePath);
      }

      const buffer = readFileSync(filePath);
      writeFileSync(cachePath, buffer);

      return buffer;
    })();

    return true;
  };
};
