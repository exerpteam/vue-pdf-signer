import { FinishPayload, SignaturePlacement } from '../types';

/**
 * A Vue composable to manage the signature capture and saving process.
 * @param props - The component's props, containing pdfData, signatureData, etc.
 * @param emit - The component's emit function.
 */
export declare function useSignature(props: {
    pdfData: string;
    signatureData: SignaturePlacement[];
    isDownload?: boolean;
    translations?: Record<string, string>;
}, emit: (e: 'finish', payload: FinishPayload) => void): {
    isSignaturePadOpen: import('vue').Ref<boolean, boolean>;
    isSaving: import('vue').Ref<boolean, boolean>;
    signatureSvg: import('vue').Ref<string | null, string | null>;
    signaturePng: import('vue').Ref<string | null, string | null>;
    t: import('vue').ComputedRef<{
        actionButton: string;
        save: string;
        updateSignature: string;
        drawSignature: string;
        saving: string;
        modalTitle: string;
        modalSubtitle: string;
        modalCancel: string;
        modalClear: string;
        modalDone: string;
    }>;
    openSignaturePad: () => void;
    handleSignatureCancel: () => void;
    handleSignatureSave: (payload: {
        svg: string;
        png: string;
    }) => void;
    saveDocument: () => Promise<void>;
};
