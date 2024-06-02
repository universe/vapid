import preact from '@preact/preset-vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import * as path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  base: 'https://website.universe.app/',
  envDir: path.join(__dirname),
  envPrefix: [
    'API_URL', 'THEME_URL', 'THEME_DEV_SERVER', 'STRIPE_TOKEN', 'FIREBASE', 'FIRESTORE' ],
  resolve: {
    dedupe: [ 'preact', 'preact/hooks', 'preact/compat', 'quill' ],
    alias: [
      { find: /^#aether\/(.*)/, replacement: '@universe/aether/$1' },
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
  // esbuild: {
  //   minifyIdentifiers: false,
  //   keepNames: true,
  // },
  build: {
    lib: {
      entry: 'javascripts/dashboard.tsx',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: '../dist',
    minify: false,
    rollupOptions: {
      treeshake: false,
      external: (name: string) => {
        return name.startsWith('@firebase') || name.startsWith('firebase') || name.startsWith('preact');
      },
    },
  },
  // build: {
  //   outDir: '../dist',
  //   minify: false,
  //   rollupOptions: {
  //     input: {
  //       index: path.join(__dirname, 'src/index.html'),
  //     },
  //   },
  // },
});
