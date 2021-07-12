import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import ignore from 'rollup-plugin-ignore';

export default [{
  input: './dist/runners/VapidServer/Dashboard/index.js',
  output: {
    name: 'vapid',
    file: './assets/dashboard/javascripts/dashboard.js',
    format: 'umd',
  },
  plugins: [
    alias({
      entries: [
        { find: 'canvas', replacement: 'canvas/browser.js' },
        { find: 'html5sortable', replacement: 'html5sortable/dist/html5sortable.es.js' },
      ],
    }),
    ignore(['jsdom']),
    resolve(),
    commonjs(),
    json(),
  ],
}];
