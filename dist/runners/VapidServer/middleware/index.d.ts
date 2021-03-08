import Koa from 'koa';
import webpack from './webpack';
import imageProcessing from './imageProcessing';
import assets from './assets';
import favicon from './favicon';
declare const _default: {
    assets: typeof assets;
    csrf: any;
    favicon: typeof favicon;
    flash: any;
    imageProcessing: typeof imageProcessing;
    logs: any;
    privateFiles: (ctx: Koa.Context, next: () => Promise<void>) => Promise<void>;
    redirect: (ctx: Koa.Context, next: () => Promise<void>) => Promise<void>;
    security: any;
    session: (app: any) => any;
    webpack: typeof webpack;
};
export default _default;
