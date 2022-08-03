import preact from '@preact/preset-vite';
import * as path from 'path';
import { defineConfig } from 'vite';

module.exports = defineConfig({
  root: './src',
  base: 'https://neutrino.dev',
  server: {
    https: true,
  },
  resolve: {
    alias: [
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom', replacement: 'preact/compat' },
      { find: 'create-react-class', replacement: 'preact/compat/lib/create-react-class' },
      { find: 'react-dom-factories', replacement: 'preact/compat/lib/react-dom-factories' },
      { find: 'html5sortable', replacement: 'html5sortable/dist/html5sortable.es.js' },
    ],
  },
  plugins: [
    preact({
      babel: {
        plugins: [
          [ '@babel/plugin-proposal-decorators', { legacy: true }],
        ],
      },
    }),
  ],
  build: {
    outDir: '../dist',
    lib: {
      entry: path.resolve(__dirname, 'src/javasripts/highlight.ts'),
      name: 'highlight',
      fileName: 'highlight',
      formats: ['es'],
    },
    rollupOptions: {
      // output: {
      //   inlineDynamicImports: true
      // },
      input: {
        index: path.join(__dirname, 'src/index.html'),
        upload: path.join(__dirname, 'src/upload.html'),
        // highlight: path.join(__dirname, 'src/javascripts/highlight.ts')
      },
    },
  },
});
