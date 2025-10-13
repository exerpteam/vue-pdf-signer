import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const sharedConfig = {
    plugins: [vue()],
    resolve: {},
  }

  if (command === 'serve') {
    // Config for the dev server (demo app)
    return {
      ...sharedConfig,
      publicDir: 'public',
      server: {
        host: true,
      },
      optimizeDeps: {
        include: ['signature_pad'],
        esbuildOptions: {
          target: 'es2020',
        },
      },
    }
  } else {
    // Config for the library build
    return {
      ...sharedConfig,
      plugins: [
        vue(),
        dts({
          tsconfigPath: './tsconfig.build.json',
          outDir: 'dist/types',
        }),
      ],
      publicDir: false,
      esbuild: {
        target: 'es2017',
      },
      optimizeDeps: {
        esbuildOptions: {
          target: 'es2017',
        },
      },
      build: {
        target: 'es2017',
        lib: {
          entry: resolve(__dirname, 'src/lib/index.ts'),
          name: 'VuePdfSigner',
          fileName: (format) => `vue-pdf-signer.${format}.js`,
        },
        rollupOptions: {
          external: ['vue'],
          output: {
            globals: {
              vue: 'Vue',
            },
            exports: 'named',
          },
        },
      },
    }
  }
})
