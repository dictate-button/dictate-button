import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solidPlugin from "vite-plugin-solid";
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
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
        inject: 'src/inject.js',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
  },
})
