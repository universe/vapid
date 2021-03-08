import config from '../../../webpack_config';
import middleware from 'koa-webpack';

/**
 * Initialize Webpack middleware
 *
 * @params {string} local - is this a local dev environment
 * @params {string} siteDir - path to website being served
 * @return {function}
 */
export default function webpacker(local: boolean, assetDirs: string[] = [], moduleDirs: string[] = [], output: boolean = false) {
  const mode = local ? 'development' : 'production';

  return middleware({
    dev: {
      logLevel: 'error',
      publicPath: '/',
    },

    hot: false,

    config: config(mode, assetDirs, moduleDirs, output),
  });
};
