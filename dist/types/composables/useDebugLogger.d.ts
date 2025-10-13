declare function log(message: string, data?: unknown): void;
declare function copyLogs(): Promise<void>;
declare function clearLogs(): void;
export declare function useDebugLogger(): {
    logs: import('vue').Ref<string[], string[]>;
    log: typeof log;
    copyLogs: typeof copyLogs;
    clearLogs: typeof clearLogs;
};
export {};
