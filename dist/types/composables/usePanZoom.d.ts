import { Ref } from 'vue';
import { PanzoomObject } from '@panzoom/panzoom';

/**
 * A Vue composable to manage Panzoom functionality.
 * @param panzoomContainer - A ref to the element that will be panned and zoomed.
 * @param viewportRef - A ref to the parent viewport element, used for boundaries and centering.
 */
export declare function usePanZoom(panzoomContainer: Ref<HTMLDivElement | null>, viewportRef: Ref<HTMLDivElement | null>): {
    panzoom: Ref<{
        bind: () => void;
        destroy: () => void;
        eventNames: {
            down: string;
            move: string;
            up: string;
        };
        getPan: () => {
            x: number;
            y: number;
        };
        getScale: () => number;
        getOptions: () => import('@panzoom/panzoom').PanzoomOptions;
        handleDown: (event: PointerEvent) => void;
        handleMove: (event: PointerEvent) => void;
        handleUp: (event: PointerEvent) => void;
        pan: (x: number | string, y: number | string, panOptions?: import('@panzoom/panzoom').PanOptions) => import('@panzoom/panzoom').CurrentValues;
        reset: (resetOptions?: import('@panzoom/panzoom').PanzoomOptions) => import('@panzoom/panzoom').CurrentValues;
        resetStyle: () => void;
        setOptions: (options?: import('@panzoom/panzoom').PanzoomOptions) => void;
        setStyle: (name: string, value: string) => void;
        zoom: (scale: number, zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomIn: (zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomOut: (zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomToPoint: (scale: number, point: {
            clientX: number;
            clientY: number;
        }, zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomWithWheel: (event: WheelEvent, zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
    } | null, PanzoomObject | {
        bind: () => void;
        destroy: () => void;
        eventNames: {
            down: string;
            move: string;
            up: string;
        };
        getPan: () => {
            x: number;
            y: number;
        };
        getScale: () => number;
        getOptions: () => import('@panzoom/panzoom').PanzoomOptions;
        handleDown: (event: PointerEvent) => void;
        handleMove: (event: PointerEvent) => void;
        handleUp: (event: PointerEvent) => void;
        pan: (x: number | string, y: number | string, panOptions?: import('@panzoom/panzoom').PanOptions) => import('@panzoom/panzoom').CurrentValues;
        reset: (resetOptions?: import('@panzoom/panzoom').PanzoomOptions) => import('@panzoom/panzoom').CurrentValues;
        resetStyle: () => void;
        setOptions: (options?: import('@panzoom/panzoom').PanzoomOptions) => void;
        setStyle: (name: string, value: string) => void;
        zoom: (scale: number, zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomIn: (zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomOut: (zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomToPoint: (scale: number, point: {
            clientX: number;
            clientY: number;
        }, zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
        zoomWithWheel: (event: WheelEvent, zoomOptions?: import('@panzoom/panzoom').ZoomOptions) => import('@panzoom/panzoom').CurrentValues;
    } | null>;
    currentZoom: Ref<number, number>;
    zoomPercentage: import('vue').ComputedRef<number>;
    initPanzoom: () => void;
    destroyPanzoom: () => void;
    updatePanState: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
};
