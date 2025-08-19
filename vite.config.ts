import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solidPlugin from "vite-plugin-solid";
import { viteStaticCopy } from 'vite-plugin-static-copy'
import pkg from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    solidPlugin(),
    dts({
      insertTypesEntry: true,
    }),
    viteStaticCopy({
      targets: [
        {
          src: '404.html',
          dest: '',
        },
      ],
    }),
  ],
  build: {
    lib: {
      entry: {
        'dictate-button': 'src/dictate-button.tsx',
        'inject-exclusive': 'src/inject-exclusive.js',
        'inject-inclusive': 'src/inject-inclusive.js',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
  },
})
