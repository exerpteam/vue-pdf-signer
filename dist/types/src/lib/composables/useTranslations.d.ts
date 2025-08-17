import { Ref } from 'vue';
import { PdfDocument } from '../types';

/**
 * A composable to manage all user-facing text within the component,
 * handling translations and dynamic button labels.
 *
 * @param props - The component's props, specifically the `translations` object.
 * @param isSaving - A ref indicating if the save process is active.
 * @param signatureSvg - A ref holding the current signature SVG data for the active document.
 * @param activeDocument - A ref to the currently active document object.
 */
export declare function useTranslations(props: {
    translations?: Record<string, string>;
}, isSaving: Ref<boolean>, signatureSvg: Ref<string | null>, activeDocument: Ref<PdfDocument | null>): {
    t: import('vue').ComputedRef<{
        actionButton: string;
        save: string;
        isSignActionDisabled: boolean;
        updateSignature: string;
        drawSignature: string;
        saving: string;
        modalTitle: string;
        modalSubtitle: string;
        modalCancel: string;
        modalClear: string;
        modalDone: string;
    }>;
};
