import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      // We'll create this tsconfig in the next step. It will ensure
      // only our library's types are generated.
      tsconfigPath: './tsconfig.build.json',
      outDir: 'dist/types',
    }),
  ],
  // This prevents assets from the demo app's public folder (like favicon.ico)
  // from being copied into our dist folder.
  publicDir: false,
  build: {
    lib: {
      // The entry point of our library.
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'VuePdfSigner',
      fileName: (format) => `vue-pdf-signer.${format}.js`,
    },
    rollupOptions: {
      // Don't bundle Vue into our library.
      external: ['vue'],
      output: {
        // Provide a global variable 'Vue' for the UMD build.
        globals: {
          vue: 'Vue',
        },
        exports: 'named',
      },
    },
  },
  // We remove the resolve alias to prevent ambiguity between lib and demo.
  resolve: {},
})
