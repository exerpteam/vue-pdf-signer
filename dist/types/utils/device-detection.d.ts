/**
 * Returns the integer major version of iOS/iPadOS (e.g., 16) if running on
 * an Apple mobile device, otherwise returns null.
 *
 * This function is designed to be resilient to modern iPadOS user agents that
 * identify as desktop Macs.
 */
export declare function getIosMajorVersion(): number | null;
