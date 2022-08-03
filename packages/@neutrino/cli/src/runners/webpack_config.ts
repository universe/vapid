import glob from 'glob';
import { relative, resolve } from 'path';

const __dirname = new URL('./index', import.meta.url).pathname;
// import MiniCssExtractPlugin from 'mini-css-extract-plugin';

/**
 * Generates entry object by scanning directories
 * for *.pack.scss, *.pack.sass, and *.pack.js files
 *
 * @param {array} dirs
 * @return {Object} entry object
 */
function _entry(dirs: string[] = []): Record<string, any> {
  return dirs.reduce((memo, dir) => {
    const packs = glob.sync(resolve(dir, '**/*.pack.+(s[ac]ss|js)'));
    packs.forEach((pack) => {
      const key = relative(dir, pack).replace(/\.pack\.[^/.]+$/, '');
      /* eslint-disable-next-line no-param-reassign */
      memo[key] = [pack];
    });

    return memo;
  }, {});
}

/**
 * Scans entries for Sass files, and excludes the associated .js garbage files
 *
 * @param {Object} entry
 * @return {array} list of files to remove from the final output
 */
function _removeFiles(entry: Record<string, any>) {
  return Object.entries(entry).reduce<string[]>((memo, [ key, value ]) => {
    if (value[0].match(/\.pack\.s[ac]ss/)) {
      memo.push(`${key}.js`);
      memo.push(`${key}.js.map`);
    }
    return memo;
  }, []);
}

/**
 * Removes files after Webpack compilation
 * Primarily used to remove superfluous JS files created during Sass compilation
 */
function RemoveFilesPlugin(this: any, options: { files?: string[] } = {}) {
  this.files = new Set(options.files || []);
}

RemoveFilesPlugin.prototype.apply = function apply(compiler: any) {
  compiler.hooks.emit.tap(this.constructor.name, (compilation: any) => {
    for (const file of Object.keys(compilation.assets)) {
      if (!this.files.has(file)) { continue; }
      /* eslint-disable-next-line no-param-reassign */
      delete compilation.assets[file];
    }
  });
};

/**
 * Dynamic config for Webpack
 *
 * @param {string} options
 * @return {Object} Webpack configuration
 */
export default function config(mode = 'production', assets: string[] = [], modules: string[] = [], outputDir = false) {
  // Ensure array inputs are actually arrays.
  const moduleDirs: string[] = Array.isArray(modules) ? modules : [modules];
  const assetDirs: string[] = Array.isArray(assets) ? assets : [assets];

  const context = resolve(__dirname, '..', 'node_modules');
  const entry = _entry(assetDirs);
  const output = outputDir ? { filename: '[name].js', path: '.' } : {};

  const removeFiles = _removeFiles(entry);
  const resolveModules = [ context, ...moduleDirs ];
  const devtool = mode === 'development' ? 'source-map' : false;

  return {
    mode,
    context,
    entry,
    output,
    devtool,
    target: 'web',
    module: {
      rules: [
        {
          test: /\.s[ac]ss$/,
          use: [
            // { loader: MiniCssExtractPlugin.loader },
            { loader: 'css-loader', options: { url: false, sourceMap: true } },
            { loader: 'resolve-url-loader' },
          ],
        },
      ],
    },

    plugins: [
      // new MiniCssExtractPlugin({
      //   filename: '[name].css',
      // }),
      // @ts-ignore
      new RemoveFilesPlugin({
        files: removeFiles,
      }),
    ],

    resolve: {
      modules: resolveModules,
    },
  };
}
