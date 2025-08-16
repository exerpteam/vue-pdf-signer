import { Ref } from 'vue';

/**
 * A composable to manage all user-facing text within the component,
 * handling translations and dynamic button labels.
 *
 * @param props - The component's props, specifically the `translations` object.
 * @param isSaving - A ref indicating if the save process is active.
 * @param signatureSvg - A ref holding the current signature SVG data.
 */
export declare function useTranslations(props: {
    translations?: Record<string, string>;
}, isSaving: Ref<boolean>, signatureSvg: Ref<string | null>): {
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
};
