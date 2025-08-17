import { ref, type Ref } from 'vue'
import {
  PDFDocument,
  PDFName,
  PDFNumber,
  asNumber,
  rgb,
  LineCapStyle,
  rectangle,
  clip,
  endPath,
  pushGraphicsState,
  popGraphicsState,
} from 'pdf-lib'
import { logger } from '../utils/debug'
import type { FinishPayload, PdfDocument, SignatureResult } from '../types'

interface SignatureData {
  svg: string
  png: string
}

/** Convert HEX to pdf-lib Color */
function hexToPdfRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || []
  const r = parseInt(m[1] || '00', 16) / 255
  const g = parseInt(m[2] || '00', 16) / 255
  const b = parseInt(m[3] || '00', 16) / 255
  return rgb(r, g, b)
}

/** Map SVG linecap → pdf-lib enum */
function toCap(cap?: string): LineCapStyle {
  switch ((cap || 'round').toLowerCase()) {
    case 'butt':
      return LineCapStyle.Butt
    case 'square':
    case 'projecting':
      return LineCapStyle.Projecting
    default:
      return LineCapStyle.Round
  }
}

/**
 * A composable to manage the final PDF document generation and saving process.
 *
 * @param documents - A ref to the array of all PdfDocuments.
 * @param newlySignedKeys - A ref to the set of keys for docs signed in this session.
 * @param emit - The component's emit function.
 * @param signatureDataMap - A ref to the map containing signature data for each document key.
 */
export function usePdfDocument(
  documents: Ref<PdfDocument[]>,
  newlySignedKeys: Ref<Set<string>>,
  emit: (e: 'finish', payload: FinishPayload) => void,
  signatureDataMap: Ref<Map<string, SignatureData>>,
  setFinished: () => void,
) {
  const isSaving = ref(false)

  async function saveDocument() {
    isSaving.value = true

    try {
      if (newlySignedKeys.value.size === 0) {
        logger.debug('No new signatures to process. Emitting empty payload.')
        emit('finish', {})
        return
      }

      const resultsMap: FinishPayload = {}

      for (const doc of documents.value) {
        if (!newlySignedKeys.value.has(doc.key)) {
          continue
        }

        const signature = signatureDataMap.value.get(doc.key)
        if (!signature) {
          logger.warn(`No signature found for document key "${doc.key}". Skipping.`)
          continue
        }

        logger.debug(`Processing document: ${doc.key}`)

        const svgDoc = new DOMParser().parseFromString(signature.svg, 'image/svg+xml')
        const svgElement = svgDoc.querySelector('svg') as SVGSVGElement | null
        const pathNodeList = Array.from(svgDoc.querySelectorAll('path')) as SVGPathElement[]

        if (!svgElement || pathNodeList.length === 0) {
          logger.error(`Signature SVG for doc "${doc.key}" is invalid. Skipping.`)
          continue
        }

        const viewBoxRaw = svgElement.getAttribute('viewBox') || '0 0 200 160'
        const [vbX, vbY, vbW, vbH] = viewBoxRaw.split(/[\s,]+/).map(Number)
        const signaturePngBase64 = signature.png.split(',')[1]

        const pdfDoc = await PDFDocument.load(doc.data)
        const placements =
          doc.placements.length > 0
            ? doc.placements
            : [{ left: 5, top: 7, width: 8, height: 4, page: 1 }]

        const CM_TO_POINTS = 72 / 2.54

        for (const placement of placements) {
          const pageIndex = placement.page - 1
          if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
            logger.warn(`Invalid page number ${placement.page}. Skipping placement.`)
            continue
          }

          const page = pdfDoc.getPage(pageIndex)
          const { height: pageHeight } = page.getSize()

          let userUnit = 1.0
          const userUnitEntry = page.node.get(PDFName.of('UserUnit'))
          if (userUnitEntry) {
            const userUnitPdfNum = pdfDoc.context.lookup(userUnitEntry, PDFNumber)
            if (userUnitPdfNum) userUnit = asNumber(userUnitPdfNum) || 1.0
          }

          const adjustedCmToPoints = CM_TO_POINTS / userUnit
          const targetWidth = placement.width * adjustedCmToPoints
          const targetHeight = placement.height * adjustedCmToPoints
          const targetX = placement.left * adjustedCmToPoints
          const targetY = pageHeight - placement.top * adjustedCmToPoints - targetHeight

          const boxW = vbW
          const boxH = vbH

          if (!boxW || !boxH) {
            logger.warn('Zero-sized source box; skipping placement')
            continue
          }

          const scale = Math.min(targetWidth / boxW, targetHeight / boxH)
          const scaledWidth = boxW * scale
          const scaledHeight = boxH * scale
          const centeredX = targetX + (targetWidth - scaledWidth) / 2
          const centeredY = targetY + (targetHeight - scaledHeight) / 2

          // We define a clipping rectangle
          // that matches the target placement area.
          page.pushOperators(
            pushGraphicsState(),
            rectangle(targetX, targetY, targetWidth, targetHeight),
            clip(),
            endPath(),
          )

          pathNodeList.forEach((el) => {
            const d = el.getAttribute('d') || ''
            if (!d) return

            const stroke = el.getAttribute('stroke') || '#000080'
            const strokeWidth = parseFloat(el.getAttribute('stroke-width') || '2')
            const strokeLinecap = el.getAttribute('stroke-linecap') || 'round'
            const offX = vbX
            const offY = vbY
            const x = centeredX - offX * scale
            const y = centeredY + scaledHeight + offY * scale

            page.drawSvgPath(d, {
              x,
              y,
              scale,
              borderColor: hexToPdfRgb(stroke),
              borderWidth: strokeWidth * scale * userUnit,
              borderLineCap: toCap(strokeLinecap),
            })
          })

          // After drawing, we restore the graphics state to remove the clip.
          page.pushOperators(popGraphicsState())
        }

        const signedPdfBase64 = await pdfDoc.saveAsBase64()

        const result: SignatureResult = {
          signedDocument: { type: 'application/pdf', data: signedPdfBase64 },
          signatureImage: { type: 'image/png', data: signaturePngBase64 },
        }
        resultsMap[doc.key] = result
      }

      emit('finish', resultsMap)
      setFinished()
    } catch (error) {
      logger.error('Failed to save document:', error)
    } finally {
      isSaving.value = false
    }
  }

  return {
    isSaving,
    saveDocument,
  }
}
