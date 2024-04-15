import preact from '@preact/preset-vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import * as path from 'path';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  root: './src',
  base: 'https://website.universe.app/',
  envDir: path.join(__dirname),
  envPrefix: [ 'API_URL', 'THEME_URL', 'STRIPE_TOKEN' ],
  resolve: {
    dedupe: [ 'preaact', 'preact/hooks', 'preact/compat', 'quill' ],
    alias: [
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom', replacement: 'preact/compat' },
      { find: 'create-react-class', replacement: 'preact/compat/lib/create-react-class' },
      { find: 'react-dom-factories', replacement: 'preact/compat/lib/react-dom-factories' },
    ],
  },
  plugins: [
    basicSsl(),
    checker({
      overlay: {
        initialIsOpen: false,
        position: 'br',
      },
      typescript: true,
      eslint: { lintCommand: "eslint '**/*.{ts,tsx}'" },
    }),
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
  //   keepNames: false,
  // },
  build: {
    lib: {
      entry: 'index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: '../dist',
    minify: false,
    rollupOptions: {
      external: [
        '@neutrinodev/core',
        'preact',
        'preact/hooks',
        'preact/compat',
        'functions-have-names',
      ],
    },
  },
});
