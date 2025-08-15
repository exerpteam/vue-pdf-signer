export interface PdfManifestEntry {
  name: string
  fileName: string
  pageSizeCm: string
  orientation: 'portrait' | 'landscape'
  userUnit: number
  signatureBoxCm: string
}

export const PDF_MANIFEST: PdfManifestEntry[] = [
  {
    name: 'Standard A4 portrait (v2, UU=1)',
    fileName: 'pdf_suite_00.pdf',
    pageSizeCm: '21.00 x 29.70',
    orientation: 'portrait',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'A4, portrait, UU=1',
    fileName: 'pdf_suite_01.pdf',
    pageSizeCm: '21.00 x 29.70',
    orientation: 'portrait',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'A4, landscape, UU=1',
    fileName: 'pdf_suite_02.pdf',
    pageSizeCm: '29.70 x 21.00',
    orientation: 'landscape',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'Letter, portrait, UU=1',
    fileName: 'pdf_suite_03.pdf',
    pageSizeCm: '21.59 x 27.94',
    orientation: 'portrait',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'Letter, landscape, UU=1',
    fileName: 'pdf_suite_04.pdf',
    pageSizeCm: '27.94 x 21.59',
    orientation: 'landscape',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'Legal, portrait, UU=1',
    fileName: 'pdf_suite_05.pdf',
    pageSizeCm: '21.59 x 35.56',
    orientation: 'portrait',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'A3, portrait, UU=1',
    fileName: 'pdf_suite_06.pdf',
    pageSizeCm: '29.70 x 42.00',
    orientation: 'portrait',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'A5, portrait, UU=1',
    fileName: 'pdf_suite_07.pdf',
    pageSizeCm: '14.80 x 21.00',
    orientation: 'portrait',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'Tabloid, landscape, UU=1',
    fileName: 'pdf_suite_08.pdf',
    pageSizeCm: '43.18 x 27.94',
    orientation: 'landscape',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'A4, portrait, UU=0.5',
    fileName: 'pdf_suite_09.pdf',
    pageSizeCm: '21.00 x 29.70',
    orientation: 'portrait',
    userUnit: 0.5,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'A4, portrait, UU=2',
    fileName: 'pdf_suite_10.pdf',
    pageSizeCm: '21.00 x 29.70',
    orientation: 'portrait',
    userUnit: 2.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
  {
    name: 'Square 20x20 cm, UU=1',
    fileName: 'pdf_suite_11.pdf',
    pageSizeCm: '20.00 x 20.00',
    orientation: 'portrait',
    userUnit: 1.0,
    signatureBoxCm: 'left=5, top=7, width=8, height=4 (from top-left)',
  },
]
