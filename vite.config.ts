import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solidPlugin(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        "btn-dictate": "src/btn-dictate.tsx",
        "inject": "src/inject.js"
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
  },
});
