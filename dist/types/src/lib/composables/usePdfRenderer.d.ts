import { Ref } from 'vue';

/**
 * interface to create a clear data structure
 * for each rendered page, which we need in the overlay composable.
 */
export interface RenderedPage {
    pageNum: number;
    canvas: HTMLCanvasElement;
    originalWidth: number;
    originalHeight: number;
}
/**
 * A Vue composable to manage PDF loading and rendering.
 * @param pdfContainer - A ref to the DOM element that will contain the rendered canvas pages.
 * @param viewportRef - A ref to the viewport element, used to calculate the initial scale.
 */
export declare function usePdfRenderer(pdfContainer: Ref<HTMLDivElement | null>, viewportRef: Ref<HTMLDivElement | null>): {
    renderedPages: Ref<{
        pageNum: number;
        canvas: HTMLCanvasElement;
        originalWidth: number;
        originalHeight: number;
    }[], RenderedPage[] | {
        pageNum: number;
        canvas: HTMLCanvasElement;
        originalWidth: number;
        originalHeight: number;
    }[]>;
    originalPdfDimensions: Ref<{
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    } | {
        width: number;
        height: number;
    }>;
    firstCanvasRef: Ref<HTMLCanvasElement | null, HTMLCanvasElement | null>;
    initialPdfScale: Ref<number, number>;
    isPdfRendered: Ref<boolean, boolean>;
    loadAndRenderPdf: (pdfData: string) => Promise<void>;
};
