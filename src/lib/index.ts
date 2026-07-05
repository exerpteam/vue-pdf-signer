import type { App } from 'vue'
import PdfSigner from './components/PdfSigner.vue'

export * from './types'

// Shape of the flag-gated runtime diagnostics exposed on window.__pdfSignerStats.
export type {
  PdfSignerStats,
  PdfSignerStatsCounters,
  PdfSignerStatsEvent,
  PdfSignerStatsMemory,
  PdfSignerStatsSnapshot,
} from './utils/pdfSignerStats'

// Named export for individual component import.
export { PdfSigner }

// Default export for Vue plugin registration (app.use).
export default {
  install(app: App) {
    app.component('PdfSigner', PdfSigner)
  },
}
