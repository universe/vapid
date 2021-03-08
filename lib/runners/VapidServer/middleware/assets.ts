import Boom from '@hapi/boom';
import mount from 'koa-mount';
import serve from 'koa-static';
import Koa from 'koa';

import { Paths } from '../../../utils';

/**
 * Looks for static assets
 *
 * @params {string} path
 * @params {string} [prefix='/'] mount path
 * @return {function}
 *
 * @throws {Boom.notFound}
 */
export default function assets(path: string, prefix = '/') {
  return async (ctx: Koa.Context, next: () => {}) => {
    const stat = Paths.isAssetPath(ctx.path);

    // If it returns an error message, throw the error.
    if (typeof stat === 'string') { throw Boom.notFound(stat); }

    // Otherwise, serve or skip accordingly.
    await (stat ? mount(prefix, serve(path))(ctx, next) : next());
  };
};
