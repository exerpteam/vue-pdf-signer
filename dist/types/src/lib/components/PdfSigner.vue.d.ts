interface SignaturePlacement {
    left: number;
    top: number;
    width: number;
    height: number;
    page: number;
}
interface FinishPayload {
    signedDocument: {
        type: 'application/pdf';
        data: string;
    };
    signatureImage: {
        type: 'image/png';
        data: string;
    };
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    pdfData: string;
    signatureData?: SignaturePlacement[];
    isDownload?: boolean;
    translations?: Record<string, string>;
    enableZoom?: boolean;
}>, {
    isDownload: boolean;
    enableZoom: boolean;
    signatureData: () => never[];
    translations: () => {};
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    finish: (payload: FinishPayload) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    pdfData: string;
    signatureData?: SignaturePlacement[];
    isDownload?: boolean;
    translations?: Record<string, string>;
    enableZoom?: boolean;
}>, {
    isDownload: boolean;
    enableZoom: boolean;
    signatureData: () => never[];
    translations: () => {};
}>>> & Readonly<{
    onFinish?: ((payload: FinishPayload) => any) | undefined;
}>, {
    signatureData: SignaturePlacement[];
    isDownload: boolean;
    translations: Record<string, string>;
    enableZoom: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
    } : {
        type: import('vue').PropType<T[K]>;
        required: true;
    };
};
type __VLS_WithDefaults<P, D> = {
    [K in keyof Pick<P, keyof P>]: K extends keyof D ? __VLS_Prettify<P[K] & {
        default: D[K];
    }> : P[K];
};
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
