import preact from '@preact/preset-vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import * as path from 'path';
import { defineConfig } from 'vite';

module.exports = defineConfig({
  root: './src',
  base: 'https://website.universe.app',
  envDir: path.join(__dirname),
  envPrefix: [ 'API_URL', 'SITE_DATA_URL' ],
  server: {
    https: true,
  },
  resolve: {
    dedupe: [ 'preaact', 'preact/hooks', 'preact/compat' ],
    alias: [
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom', replacement: 'preact/compat' },
      { find: 'create-react-class', replacement: 'preact/compat/lib/create-react-class' },
      { find: 'react-dom-factories', replacement: 'preact/compat/lib/react-dom-factories' },
      { find: 'html5sortable', replacement: 'html5sortable/dist/html5sortable.es.js' },
    ],
  },
  plugins: [
    basicSsl(),
    preact({
      babel: {
        plugins: [
          [ '@babel/plugin-proposal-decorators', { legacy: true }],
          // [ 'babel-plugin-transform-hook-names', false ],
        ],
      },
    }),
  ],
  build: {
    outDir: '../dist',
    minify: false,
    rollupOptions: {
      input: {
        index: path.join(__dirname, 'src/index.html'),
      },
    },
  },
});
