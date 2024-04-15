import preact from '@preact/preset-vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import module from 'module';
import * as path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  base: 'https://website.universe.app/',
  envDir: path.join(__dirname),
  envPrefix: [ 'API_URL', 'THEME_URL', 'STRIPE_TOKEN' ],
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
        ],
      },
    }),
  ],
  build: {
    lib: {
      entry: './entry.ts',
      fileName: '[name]',
      formats: ['es'],
    },
    outDir: '../dist',
    minify: false,
    rollupOptions: {
      input: [
        path.resolve(__dirname, './src/entry.ts'),
        path.resolve(__dirname, './src/cli.ts'),
        path.resolve(__dirname, './src/css-loader.ts'),
        path.resolve(__dirname, './src/noop.ts'),
      ],
      output: {
        preserveModules: false,
      },
      treeshake: false,
      external: (name: string) => {
        return name.includes('simple-dom') ||
          name.includes('livereload') ||
          module.builtinModules.includes(name);
      },
    },
  },
});
