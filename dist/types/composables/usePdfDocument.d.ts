import { Ref } from 'vue';
import { FinishPayload, PdfDocument } from '../types';

interface SignatureData {
    svg: string;
    png: string;
}
/**
 * A composable to manage the final PDF document generation and saving process.
 *
 * @param documents - A ref to the array of all PdfDocuments.
 * @param newlySignedKeys - A ref to the set of keys for docs signed in this session.
 * @param emit - The component's emit function.
 * @param signatureDataMap - A ref to the map containing signature data for each document key.
 */
export declare function usePdfDocument(documents: Ref<PdfDocument[]>, newlySignedKeys: Ref<Set<string>>, emit: (e: 'finish', payload: FinishPayload) => void, signatureDataMap: Ref<Map<string, SignatureData>>, setFinished: () => void): {
    isSaving: Ref<boolean, boolean>;
    saveDocument: () => Promise<void>;
};
export {};
