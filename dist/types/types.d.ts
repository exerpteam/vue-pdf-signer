export interface SignaturePlacement {
    left: number;
    top: number;
    width: number;
    height: number;
    page: number;
}
/**
 * This represents a single document within the multi-document list.
 * - `key`: A unique identifier for this document.
 * - `signed`: Indicates if the document has a pre-existing signature.
 */
export interface PdfDocument {
    key: string;
    name?: string;
    data: string;
    placements: SignaturePlacement[];
    signed?: boolean;
}
/**
 * This represents the output for a single signed document.
 */
export interface SignatureResult {
    signedDocument: {
        type: 'application/pdf';
        data: string;
    };
    signatureImage: {
        type: 'image/png';
        data: string;
    };
}
/**
 * The finish event now emits a map where each key is the
 * document's `key` and the value is its corresponding signature result.
 */
export type FinishPayload = Record<string, SignatureResult>;
