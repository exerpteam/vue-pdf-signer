import { Ref } from 'vue';
import { SignaturePlacement } from '../types';

/**
 * A Vue composable to calculate the styles for the signature preview overlays.
 * @param firstCanvasRef - A ref to the first rendered canvas element.
 * @param pdfContainer - A ref to the container holding all canvas elements.
 * @param originalPdfDimensions - A ref to the original, unscaled dimensions of the PDF page.
 * @param signatureData - A ref to the array of signature placement configurations from props.
 * @param showSignatureBounds - A ref to the prop that toggles the visibility of debug borders.
 */
export declare function useSignatureOverlay(firstCanvasRef: Ref<HTMLCanvasElement | null>, pdfContainer: Ref<HTMLDivElement | null>, originalPdfDimensions: Ref<{
    width: number;
    height: number;
}>, signatureData: Ref<SignaturePlacement[]>, showSignatureBounds: Ref<boolean>): {
    signatureStyles: import('vue').ComputedRef<({
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
    })[]>;
};
