import { ref, type Ref } from 'vue'
import { PDFDocument, PDFName, PDFNumber, asNumber, rgb, LineCapStyle } from 'pdf-lib'
import { logger } from '../utils/debug'
import type { FinishPayload, PdfDocument, SignatureResult } from '../types'

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

/** Compute union BBox of all <path> elements in the SVG coordinate space */
function getUnionBBox(svgEl: SVGSVGElement, paths: SVGPathElement[]) {
  const NS = 'http://www.w3.org/2000/svg'
  const tempSvg = document.createElementNS(NS, 'svg')
  const vb = svgEl.getAttribute('viewBox') || '0 0 0 0'
  tempSvg.setAttribute('viewBox', vb)
  tempSvg.setAttribute('width', '0')
  tempSvg.setAttribute('height', '0')
  tempSvg.style.position = 'absolute'
  tempSvg.style.opacity = '0'
  document.body.appendChild(tempSvg)

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  paths.forEach((p) => {
    const clone = document.createElementNS(NS, 'path')
    clone.setAttribute('d', p.getAttribute('d') || '')
    tempSvg.appendChild(clone)
    try {
      const bb = clone.getBBox()
      minX = Math.min(minX, bb.x)
      minY = Math.min(minY, bb.y)
      maxX = Math.max(maxX, bb.x + bb.width)
      maxY = Math.max(maxY, bb.y + bb.height)
    } catch (e) {
      logger.warn('getBBox failed for path', { e })
    } finally {
      tempSvg.removeChild(clone)
    }
  })

  document.body.removeChild(tempSvg)
  const width = Math.max(0, maxX - minX)
  const height = Math.max(0, maxY - minY)
  return { minX, minY, width, height }
}

/**
 * A composable to manage the final PDF document generation and saving process.
 *
 * @param documents - A ref to the array of all PdfDocuments.
 * @param newlySignedKeys - A ref to the set of keys for docs signed in this session.
 * @param emit - The component's emit function.
 * @param signatureSvg - A ref to the current signature SVG string.
 * @param signaturePng - A ref to the current signature PNG string.
 */
export function usePdfDocument(
  documents: Ref<PdfDocument[]>,
  newlySignedKeys: Ref<Set<string>>,
  emit: (e: 'finish', payload: FinishPayload) => void,
  signatureSvg: Ref<string | null>,
  signaturePng: Ref<string | null>,
) {
  const isSaving = ref(false)

  /**
   * Generates the final signed PDF, emits the result, and handles download.
   */
  async function saveDocument() {
    if (!signatureSvg.value || !signaturePng.value || newlySignedKeys.value.size === 0) {
      logger.warn('Save called without a signature or any newly signed documents.')
      return
    }

    isSaving.value = true

    try {
      const svgDoc = new DOMParser().parseFromString(signatureSvg.value, 'image/svg+xml')
      const svgElement = svgDoc.querySelector('svg') as SVGSVGElement | null
      const pathNodeList = Array.from(svgDoc.querySelectorAll('path')) as SVGPathElement[]

      if (!svgElement || pathNodeList.length === 0) {
        logger.error('Signature SVG missing <svg> or <path> elements')
        isSaving.value = false
        return
      }

      const viewBoxRaw = svgElement.getAttribute('viewBox') || '0 0 200 160'
      const [vbX, vbY, vbW, vbH] = viewBoxRaw.split(/[\s,]+/).map(Number)
      const union = getUnionBBox(svgElement, pathNodeList)

      const resultsMap: FinishPayload = {}
      const signaturePngBase64 = signaturePng.value.split(',')[1]

      // we loop through all documents.
      for (const doc of documents.value) {
        // We only process the ones that were signed in this session.
        if (!newlySignedKeys.value.has(doc.key)) {
          continue
        }

        logger.debug(`Processing document: ${doc.key}`)
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

          const useUnionBBox = true
          const boxW = useUnionBBox ? union.width : vbW - vbX
          const boxH = useUnionBBox ? union.height : vbH - vbY

          if (!boxW || !boxH) {
            logger.warn('Zero-sized source box; skipping placement')
            continue
          }

          const scale = Math.min(targetWidth / boxW, targetHeight / boxH)
          const scaledWidth = boxW * scale
          const scaledHeight = boxH * scale
          const centeredX = targetX + (targetWidth - scaledWidth) / 2
          const centeredY = targetY + (targetHeight - scaledHeight) / 2

          pathNodeList.forEach((el) => {
            const d = el.getAttribute('d') || ''
            if (!d) return

            const stroke = el.getAttribute('stroke') || '#000080'
            const strokeWidth = parseFloat(el.getAttribute('stroke-width') || '2')
            const strokeLinecap = el.getAttribute('stroke-linecap') || 'round'
            const offX = useUnionBBox ? union.minX : vbX
            const offY = useUnionBBox ? union.minY : vbY
            const x = centeredX - offX * scale
            const y = centeredY + scaledHeight + offY * scale

            page.drawSvgPath(d, {
              x,
              y,
              scale,
              borderColor: hexToPdfRgb(stroke),
              borderWidth: strokeWidth * scale,
              borderLineCap: toCap(strokeLinecap),
            })
          })
        }

        const signedPdfBase64 = await pdfDoc.saveAsBase64()

        const result: SignatureResult = {
          signedDocument: { type: 'application/pdf', data: signedPdfBase64 },
          signatureImage: { type: 'image/png', data: signaturePngBase64 },
        }
        resultsMap[doc.key] = result
      }

      emit('finish', resultsMap)
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
