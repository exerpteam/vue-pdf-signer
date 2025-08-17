/**
 *
 * Processes a raw SVG string from signature_pad to make it scalable and embeddable.
 * - Adds a viewBox if missing.
 * - Removes fixed width/height attributes.
 * - Sets preserveAspectRatio.
 * @param svg The raw SVG string.
 * @returns A processed SVG string, or null if the input is invalid.
 */
export declare function processSignatureSVG(svg: string): string | null;
/**
 * A composable to manage the state of the signature pad modal.
 */
export declare function useSignaturePad(): {
    isSignaturePadOpen: import('vue').Ref<boolean, boolean>;
    openSignaturePad: () => void;
    closeSignaturePad: () => void;
};
