import { Ref } from 'vue';
import { FinishPayload, PdfDocument } from '../types';

/**
 * A composable to manage the final PDF document generation and saving process.
 *
 * @param documents - A ref to the array of all PdfDocuments.
 * @param newlySignedKeys - A ref to the set of keys for docs signed in this session.
 * @param emit - The component's emit function.
 * @param signatureSvg - A ref to the current signature SVG string.
 * @param signaturePng - A ref to the current signature PNG string.
 */
export declare function usePdfDocument(documents: Ref<PdfDocument[]>, newlySignedKeys: Ref<Set<string>>, emit: (e: 'finish', payload: FinishPayload) => void, signatureSvg: Ref<string | null>, signaturePng: Ref<string | null>): {
    isSaving: Ref<boolean, boolean>;
    saveDocument: () => Promise<void>;
};
