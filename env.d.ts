declare module '*?url'

/// <reference types="vite/client" />

// this makes TypeScript aware of our custom environment
// variables, resolving the build error.
interface ImportMetaEnv {
  readonly VITE_APP_DEBUG_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
