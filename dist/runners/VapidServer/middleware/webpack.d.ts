/**
 * Initialize Webpack middleware
 *
 * @params {string} local - is this a local dev environment
 * @params {string} siteDir - path to website being served
 * @return {function}
 */
export default function webpacker(local: boolean, assetDirs?: string[], moduleDirs?: string[], output?: boolean): any;
