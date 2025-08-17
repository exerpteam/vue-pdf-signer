import { Ref } from 'vue';
import { SignaturePlacement } from '../types';
import { RenderedPage } from './usePdfRenderer';

/**
 * A Vue composable to calculate the styles for the signature preview overlays.
 * @param renderedPages - A ref to the array of rendered page data from the renderer.
 * @param pdfContainer - A ref to the container holding all canvas elements.
 * @param signatureData - A ref to the array of signature placement configurations from props.
 * @param showSignatureBounds - A ref to the prop that toggles the visibility of debug borders.
 */
export declare function useSignatureOverlay(renderedPages: Ref<RenderedPage[]>, pdfContainer: Ref<HTMLDivElement | null>, signatureData: Ref<SignaturePlacement[]>, showSignatureBounds: Ref<boolean>): {
    signatureStyles: import('vue').ComputedRef<NonNullable<{
        position: "absolute";
        left: string;
        top: string;
        width: string;
        height: string;
        pointerEvents: "none";
    } | {
        border: string;
        backgroundColor: string;
        position: "absolute";
        left: string;
        top: string;
        width: string;
        height: string;
        pointerEvents: "none";
    } | null>[]>;
};
