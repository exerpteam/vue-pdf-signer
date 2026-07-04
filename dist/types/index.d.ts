import { App } from 'vue';
import { default as PdfSigner } from './components/PdfSigner.vue';

export * from './types';
export type { PdfSignerStats, PdfSignerStatsCounters, PdfSignerStatsEvent, PdfSignerStatsMemory, PdfSignerStatsSnapshot, } from './utils/pdfSignerStats';
export { PdfSigner };
declare const _default: {
    install(app: App): void;
};
export default _default;
