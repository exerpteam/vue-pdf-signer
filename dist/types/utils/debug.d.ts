export declare const isDebug: import('vue').Ref<boolean, boolean>;
/**
 * Logs a debug message to the console if debug mode is enabled.
 * @param message - The primary message to log.
 * @param optionalParams - Additional data to log. Objects will be deep-cloned
 *                         and stringified for better inspection on mobile.
 */
export declare const logger: {
    debug(message: string, ...optionalParams: unknown[]): void;
    /**
     * Logs a warning message to the console. Not affected by debug mode.
     */
    warn(message: string, ...optionalParams: unknown[]): void;
    /**
     * Logs an error message to the console. Not affected by debug mode.
     */
    error(message: string, ...optionalParams: unknown[]): void;
};
