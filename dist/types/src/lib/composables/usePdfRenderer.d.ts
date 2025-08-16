import { Ref } from 'vue';

import * as pdfjsLib from 'pdfjs-dist';
/**
 * A Vue composable to manage PDF loading and rendering.
 * @param pdfContainer - A ref to the DOM element that will contain the rendered canvas pages.
 * @param viewportRef - A ref to the viewport element, used to calculate the initial scale.
 */
export declare function usePdfRenderer(pdfContainer: Ref<HTMLDivElement | null>, viewportRef: Ref<HTMLDivElement | null>): {
    pageDetails: Ref<{
        page: {
            _pageIndex: any;
            _pageInfo: any;
            _transport: any;
            _stats: {
                started: any;
                times: any[];
                time: (name: any) => void;
                timeEnd: (name: any) => void;
                toString: () => string;
            } | null;
            _pdfBug: boolean;
            commonObjs: {
                get: (objId: string, callback?: Function) => any;
                has: (objId: string) => boolean;
                delete: (objId: string) => boolean;
                resolve: (objId: string, data?: any) => void;
                clear: () => void;
                [Symbol.iterator]: () => Generator<any[], void, unknown>;
            };
            objs: {
                get: (objId: string, callback?: Function) => any;
                has: (objId: string) => boolean;
                delete: (objId: string) => boolean;
                resolve: (objId: string, data?: any) => void;
                clear: () => void;
                [Symbol.iterator]: () => Generator<any[], void, unknown>;
            };
            _intentStates: Map<any, any> & Omit<Map<any, any>, keyof Map<any, any>>;
            destroyed: boolean;
            readonly pageNumber: number;
            readonly rotate: number;
            readonly ref: {
                num: number;
                gen: number;
            } | null;
            readonly userUnit: number;
            readonly view: Array<number>;
            getViewport: ({ scale, rotation, offsetX, offsetY, dontFlip, }?: import('pdfjs-dist/types/src/display/api').GetViewportParameters) => import('pdfjs-dist/types/src/display/display_utils').PageViewport;
            getAnnotations: ({ intent }?: import('pdfjs-dist/types/src/display/api').GetAnnotationsParameters) => Promise<Array<any>>;
            getJSActions: () => Promise<Object>;
            readonly filterFactory: Object;
            readonly isPureXfa: boolean;
            getXfa: () => Promise<Object | null>;
            render: ({ canvasContext, canvas, viewport, intent, annotationMode, transform, background, optionalContentConfigPromise, annotationCanvasMap, pageColors, printAnnotationStorage, isEditing, }: import('pdfjs-dist/types/src/display/api').RenderParameters) => import('pdfjs-dist/types/src/display/api').RenderTask;
            getOperatorList: ({ intent, annotationMode, printAnnotationStorage, isEditing, }?: import('pdfjs-dist/types/src/display/api').GetOperatorListParameters) => Promise<import('pdfjs-dist/types/src/display/api').PDFOperatorList>;
            streamTextContent: ({ includeMarkedContent, disableNormalization, }?: import('pdfjs-dist/types/src/display/api').getTextContentParameters) => ReadableStream;
            getTextContent: (params?: import('pdfjs-dist/types/src/display/api').getTextContentParameters) => Promise<import('pdfjs-dist/types/src/display/api').TextContent>;
            getStructTree: () => Promise<import('pdfjs-dist/types/src/display/api').StructTreeNode>;
            cleanup: (resetStats?: boolean) => boolean;
            readonly stats: {
                started: any;
                times: any[];
                time: (name: any) => void;
                timeEnd: (name: any) => void;
                toString: () => string;
            } | null;
        };
        canvas: HTMLCanvasElement;
    }[], {
        page: pdfjsLib.PDFPageProxy;
        canvas: HTMLCanvasElement;
    }[] | {
        page: {
            _pageIndex: any;
            _pageInfo: any;
            _transport: any;
            _stats: {
                started: any;
                times: any[];
                time: (name: any) => void;
                timeEnd: (name: any) => void;
                toString: () => string;
            } | null;
            _pdfBug: boolean;
            commonObjs: {
                get: (objId: string, callback?: Function) => any;
                has: (objId: string) => boolean;
                delete: (objId: string) => boolean;
                resolve: (objId: string, data?: any) => void;
                clear: () => void;
                [Symbol.iterator]: () => Generator<any[], void, unknown>;
            };
            objs: {
                get: (objId: string, callback?: Function) => any;
                has: (objId: string) => boolean;
                delete: (objId: string) => boolean;
                resolve: (objId: string, data?: any) => void;
                clear: () => void;
                [Symbol.iterator]: () => Generator<any[], void, unknown>;
            };
            _intentStates: Map<any, any> & Omit<Map<any, any>, keyof Map<any, any>>;
            destroyed: boolean;
            readonly pageNumber: number;
            readonly rotate: number;
            readonly ref: {
                num: number;
                gen: number;
            } | null;
            readonly userUnit: number;
            readonly view: Array<number>;
            getViewport: ({ scale, rotation, offsetX, offsetY, dontFlip, }?: import('pdfjs-dist/types/src/display/api').GetViewportParameters) => import('pdfjs-dist/types/src/display/display_utils').PageViewport;
            getAnnotations: ({ intent }?: import('pdfjs-dist/types/src/display/api').GetAnnotationsParameters) => Promise<Array<any>>;
            getJSActions: () => Promise<Object>;
            readonly filterFactory: Object;
            readonly isPureXfa: boolean;
            getXfa: () => Promise<Object | null>;
            render: ({ canvasContext, canvas, viewport, intent, annotationMode, transform, background, optionalContentConfigPromise, annotationCanvasMap, pageColors, printAnnotationStorage, isEditing, }: import('pdfjs-dist/types/src/display/api').RenderParameters) => import('pdfjs-dist/types/src/display/api').RenderTask;
            getOperatorList: ({ intent, annotationMode, printAnnotationStorage, isEditing, }?: import('pdfjs-dist/types/src/display/api').GetOperatorListParameters) => Promise<import('pdfjs-dist/types/src/display/api').PDFOperatorList>;
            streamTextContent: ({ includeMarkedContent, disableNormalization, }?: import('pdfjs-dist/types/src/display/api').getTextContentParameters) => ReadableStream;
            getTextContent: (params?: import('pdfjs-dist/types/src/display/api').getTextContentParameters) => Promise<import('pdfjs-dist/types/src/display/api').TextContent>;
            getStructTree: () => Promise<import('pdfjs-dist/types/src/display/api').StructTreeNode>;
            cleanup: (resetStats?: boolean) => boolean;
            readonly stats: {
                started: any;
                times: any[];
                time: (name: any) => void;
                timeEnd: (name: any) => void;
                toString: () => string;
            } | null;
        };
        canvas: HTMLCanvasElement;
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
