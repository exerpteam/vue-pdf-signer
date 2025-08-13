import type { App } from 'vue'
import PdfSigner from './components/PdfSigner.vue'

// ✍️ Named export for individual component import.
export { PdfSigner }

// ✍️ Default export for Vue plugin registration (app.use).
export default {
  install(app: App) {
    app.component('PdfSigner', PdfSigner)
  },
}
