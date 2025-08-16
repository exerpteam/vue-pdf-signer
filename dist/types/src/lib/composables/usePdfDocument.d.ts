import { Ref } from 'vue';
import { FinishPayload, SignaturePlacement } from '../types';

/**
 * A composable to manage the final PDF document generation and saving process.
 *
 * @param pdfData - A ref to the base64 PDF string.
 * @param signatureData - A ref to the array of signature placements.
 * @param emit - The component's emit function.
 * @param signatureSvg - A ref to the current signature SVG string.
 * @param signaturePng - A ref to the current signature PNG string.
 */
export declare function usePdfDocument(pdfData: Ref<string>, signatureData: Ref<SignaturePlacement[]>, emit: (e: 'finish', payload: FinishPayload) => void, signatureSvg: Ref<string | null>, signaturePng: Ref<string | null>): {
    isSaving: Ref<boolean, boolean>;
    saveDocument: () => Promise<void>;
};
