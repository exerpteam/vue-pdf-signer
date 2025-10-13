# Build Target Comparison

## Context
- Baseline commit `a58a405` (_attempt 1: upgrade sign library_) uses a single Vite config for both library builds and the demo dev server.
- Current branch `tmp-mla-test` at `73927ba` restructures the Vite config and explicitly down-levels bundling to ES2017 while adding demo-specific tooling.

## Configuration Comparison

| Concern | a58a405 | Current branch (`tmp-mla-test` @ `73927ba`) |
| --- | --- | --- |
| Vite config structure | Static `defineConfig({...})` exporting one config for all commands (`a/vite.config.ts:7-40`). | `defineConfig(({ command }) => ...)` splits dev (`serve`) and build paths with shared defaults (`vite.config.ts:7-67`). |
| Dev server `publicDir` | Disabled (`publicDir: false`). | Uses `public` so demo assets are served in dev (`vite.config.ts:16-19`). |
| Dev server `optimizeDeps.include` | Not set; Vite decides automatically. | Forces `signature_pad` pre-bundling and pins `esbuildOptions.target` to `es2020` to match modern browsers (`vite.config.ts:21-26`). |
| Library build `build.target` | Not set; defaults to Vite’s `modules` (≈ES2020+) (`a/vite.config.ts:20-38`). | Explicitly `es2017`, ensuring Rollup output is transpiled for ES2017 runtimes (`vite.config.ts:48-64`). |
| Library build `esbuild.target` | Not set; falls back to `esnext`. | Explicit `es2017` for both `esbuild` and `optimizeDeps.esbuildOptions`, keeping transforms aligned (`vite.config.ts:40-47`). |
| TypeScript compiler target | Inherited `ESNext` from `@vue/tsconfig/tsconfig.dom.json` (`a/tsconfig.build.json:1-14`, `node_modules/@vue/tsconfig/tsconfig.json:39-50`). | Unchanged; still `ESNext`, so TS emits modern syntax that esbuild down-levels during bundling (`tsconfig.build.json`, `tsconfig.app.json`). |
| NPM scripts | `dev`, `build`, `preview`, `lint`, `format` (`a/package.json:20-26`). | Adds `build:demo` and `preview:demo` for the standalone demo build (`package.json:20-26`). |
| Distribution entry points | `main` UMD and `module` ESM targets under `dist/` (`a/package.json:9-19`). | Unchanged. |

## Detailed Notes

### Before (commit `a58a405`)
- Vite configured a single library-focused build that produced both ESM and UMD bundles (`a/vite.config.ts`).
- Because no `build.target` or `esbuild.target` overrides were provided, Vite targeted modern evergreen browsers (roughly ES2020) and left syntax such as optional chaining intact when producing the final bundles.
- Dev tooling reused the same config, so demo assets were never served via `publicDir`, and dependency pre-bundling relied entirely on Vite defaults.

### Current Branch (`tmp-mla-test` @ `73927ba`)
- The config now branches on `command` to tailor behaviour: dev server gets host exposure, `public/` assets, and an explicit dependency include list; the library build path retains the DTS plugin and library metadata (`vite.config.ts:7-67`).
- All build-time transformations are explicitly pinned to `es2017`, covering both `build.target` and the two `esbuild` hooks (`vite.config.ts:40-64`). This keeps generated code compatible with environments that lack newer syntax such as nullish coalescing or top-level await.
- Additional npm scripts (`build:demo`, `preview:demo`) allow building the demo app with `vite.preview.config.ts`, isolating demo distribution from the library package (`package.json:20-26`).

## Impact on the Library Distribution
- Library bundles (`dist/vue-pdf-signer.es.js`, `dist/vue-pdf-signer.umd.js`) are now emitted at an ES2017 target, increasing runtime compatibility (e.g. older Chromium, embedded WebViews) at the cost of slightly larger output from extra transpilation.
- Type declaration output remains unchanged (`dist/types`), as DTS generation still flows through `vite-plugin-dts` with the same `tsconfig.build.json` settings.
- Consumers targeting modern browsers should see no functional changes, but those previously unable to run ES2020 syntax should now succeed without manually transpiling the package.
