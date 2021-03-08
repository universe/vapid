import Koa from 'koa';
/**
 * Looks for static assets
 *
 * @params {string} path
 * @params {string} [prefix='/'] mount path
 * @return {function}
 *
 * @throws {Boom.notFound}
 */
export default function assets(path: string, prefix?: string): (ctx: Koa.Context, next: () => {}) => Promise<void>;
