import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// This config is specifically for building the demo application.
export default defineConfig({
  plugins: [vue()],
  // The root is where index.html is located.
  root: '.',
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
    // The output directory for the demo build.
    outDir: 'preview-dist',
    // Ensure the base path is correct for assets.
    assetsDir: 'assets',
  },
  // Explicitly set the public directory.
  publicDir: 'public',
  resolve: {
    alias: {
      // You can add aliases if needed for the demo app
    },
  },
})
