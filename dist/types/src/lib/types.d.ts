export interface SignaturePlacement {
    left: number;
    top: number;
    width: number;
    height: number;
    page: number;
}
export interface SignableDocument {
    name?: string;
    data: string;
    placements: SignaturePlacement[];
}
export interface FinishPayload {
    signedDocument: {
        type: 'application/pdf';
        data: string;
    };
    signatureImage: {
        type: 'image/png';
        data: string;
    };
}
