/**
 * A composable to manage the state of the signature pad modal and the captured signature data.
 */
export declare function useSignaturePad(): {
    isSignaturePadOpen: import('vue').Ref<boolean, boolean>;
    signatureSvg: import('vue').Ref<string | null, string | null>;
    signaturePng: import('vue').Ref<string | null, string | null>;
    openSignaturePad: () => void;
    handleSignatureCancel: () => void;
    handleSignatureSave: (payload: {
        svg: string;
        png: string;
    }) => void;
};
