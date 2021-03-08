import Koa from 'koa';
/**
 * Serves the first favicon found in the supplied paths
 *
 * @param {array} [paths=[]]
 * @parms {Object} options
 * @return {function|boolean}
 */
export default function favicon(paths?: string[], options?: {
    maxAge: number | null;
}): (ctx: Koa.Context, next: () => {}) => {};
