export interface PdfSignerStatsCounters {
    componentMounts: number;
    componentUnmounts: number;
    listenersAdded: number;
    listenersRemoved: number;
    activeListeners: number;
    pdfDocsCreated: number;
    pdfDocsDestroyed: number;
    activeDocs: number;
    loadingTasksStarted: number;
    loadingTasksDestroyed: number;
    renderTasksStarted: number;
    renderTasksCompleted: number;
    renderTasksCancelled: number;
    canvasesCreated: number;
    maxCanvasPixels: number;
}
export interface PdfSignerStatsMemory {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}
export interface PdfSignerStatsSnapshot {
    /** Wall-clock ms (Date.now()) — aligns with CI log timestamps. */
    t: number;
    /** Monotonic ms (performance.now(), rounded) — for intra-run deltas. */
    tMono: number;
    /** 'mount' | 'unmount' | 'sign-step:<step>' */
    label: string;
    detail?: string;
    counters: PdfSignerStatsCounters;
    memory: PdfSignerStatsMemory | null;
}
export interface PdfSignerStatsEvent {
    t: number;
    kind: string;
    detail?: string;
}
export interface PdfSignerStats {
    startedAt: number;
    counters: PdfSignerStatsCounters;
    /** Per `target:type` listener add/remove counts, e.g. 'viewport:wheel'. */
    listenerBreakdown: Record<string, {
        added: number;
        removed: number;
    }>;
    /** One entry per mount/unmount/sign-step boundary, unbounded. */
    snapshots: PdfSignerStatsSnapshot[];
    /** Bounded ring buffer — oldest entries are dropped in chunks once full. */
    events: PdfSignerStatsEvent[];
    eventsDropped: number;
}
/**
 * Re-checks the enable flag and creates the global stats object on first enabled
 * call. Idempotent; called from PdfSigner's setup.
 */
export declare function statsInit(): void;
/** True once statsInit() has run with the flag on. */
export declare function statsEnabled(): boolean;
export declare function statsMounted(): void;
export declare function statsUnmounted(): void;
export declare function statsSignStep(step: string, detail?: string): void;
export declare function statsListenerAdded(target: string, type: string): void;
export declare function statsListenerRemoved(target: string, type: string): void;
export declare function statsLoadingTaskStarted(): void;
export declare function statsLoadingTaskDestroyed(): void;
export declare function statsDocCreated(): void;
export declare function statsDocDestroyed(): void;
export declare function statsRenderTaskStarted(): void;
export declare function statsRenderTaskCompleted(): void;
export declare function statsRenderTaskCancelled(): void;
export declare function statsCanvasCreated(width: number, height: number): void;
