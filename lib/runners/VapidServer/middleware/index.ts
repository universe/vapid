import * as path from 'path';
import flash from 'koa-better-flash';
import CSRF from 'koa-csrf';
import koaLog from 'koa-log';
import Boom from '@hapi/boom';
import Koa from 'koa';
import helmet  from 'koa-helmet';
import sess from 'koa-session';
import convert from 'koa-convert';
import webpack from './webpack';
import imageProcessing from './imageProcessing';
import assets from './assets';
import favicon from './favicon';

const PRIVATE_FILE_PREFIXES = new Set([ '_', '.' ])

export default {
  assets,
  csrf: new CSRF({
    invalidSessionSecretMessage: 'Invalid session secret',
    invalidSessionSecretStatusCode: 403,
    invalidTokenMessage: 'Invalid CSRF token',
    invalidTokenStatusCode: 403,
    excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
    disableQuery: false,
  }),
  favicon,
  flash: flash(),
  imageProcessing,
  logs: koaLog('tiny'),

  // Throw 404 if the path starts with an underscore or period
  privateFiles: async function privateFiles(ctx: Koa.Context, next: () => Promise<void>) {
    if (PRIVATE_FILE_PREFIXES.has(path.basename(ctx.path)[0])) {
      throw Boom.notFound('Filenames starting with an underscore or period are private, and cannot be served.');
    }
    await next();
  },

  // Custom redirect for turbolinks
  redirect: async (ctx: Koa.Context, next: () => Promise<void>) => {
    // Override ctx.render
    const { redirect } = ctx;
  
    ctx.redirect = (url: string, alt: string) => {
      ctx.set('Turbolinks-Location', url);
      redirect.apply(ctx, [url, alt]);
    };
  
    await next();
  },
  security: helmet(),
  session: (app: any) => convert(sess(app, { key: 'vapid:sess' })),
  webpack,
}
