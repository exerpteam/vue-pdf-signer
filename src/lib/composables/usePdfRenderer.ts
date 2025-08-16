import { ref, markRaw, type Ref } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { logger } from '../utils/debug'

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const HIGH_RES_SCALE_FACTOR = 4
const DPR = Math.min(window.devicePixelRatio || 1, 2)

/**
 * A Vue composable to manage PDF loading and rendering.
 * @param pdfContainer - A ref to the DOM element that will contain the rendered canvas pages.
 * @param viewportRef - A ref to the viewport element, used to calculate the initial scale.
 */
export function usePdfRenderer(
  pdfContainer: Ref<HTMLDivElement | null>,
  viewportRef: Ref<HTMLDivElement | null>,
) {
  // --- START: Reactive State ---
  const pageDetails = ref<Array<{ page: pdfjsLib.PDFPageProxy; canvas: HTMLCanvasElement }>>([])
  const originalPdfDimensions = ref({ width: 0, height: 0 })
  const firstCanvasRef = ref<HTMLCanvasElement | null>(null)
  const initialPdfScale = ref(1)
  const isPdfRendered = ref(false)
  // --- END: Reactive State ---

  /**
   * Renders the PDF pages onto canvas elements.
   */
  async function renderInitialPdfPages(pdf: pdfjsLib.PDFDocumentProxy, scale: number) {
    if (!pdfContainer.value) return

    initialPdfScale.value = scale

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const unscaledViewport = page.getViewport({ scale: 1 })

      if (pageNum === 1) {
        originalPdfDimensions.value = {
          width: unscaledViewport.width,
          height: unscaledViewport.height,
        }
      }

      const highResViewport = page.getViewport({ scale: scale * HIGH_RES_SCALE_FACTOR })
      const displayViewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!

      canvas.style.display = 'block'
      canvas.style.margin = '0 auto 1rem auto'
      canvas.width = Math.floor(highResViewport.width * DPR)
      canvas.height = Math.floor(highResViewport.height * DPR)
      canvas.style.width = `${Math.floor(displayViewport.width)}px`
      canvas.style.height = `${Math.floor(displayViewport.height)}px`

      if (pageNum === 1) {
        firstCanvasRef.value = canvas
      }

      pdfContainer.value.appendChild(canvas)
      pageDetails.value.push({ page: markRaw(page), canvas })

      const renderContext = {
        canvasContext: context,
        viewport: highResViewport,
        transform: DPR !== 1 ? [DPR, 0, 0, DPR, 0, 0] : undefined,
        canvas,
      }
      await page.render(renderContext).promise
    }
  }

  /**
   * Main function to load a PDF from base64 data, render it, and set up interactions.
   */
  async function loadAndRenderPdf(pdfData: string) {
    if (!pdfData || !pdfContainer.value || !viewportRef.value) return

    // Reset state before rendering a new PDF
    pdfContainer.value.innerHTML = ''
    pageDetails.value = []
    isPdfRendered.value = false

    try {
      const pdfBinary = atob(pdfData)
      const pdfBytes = new Uint8Array(pdfBinary.length)
      for (let i = 0; i < pdfBinary.length; i++) {
        pdfBytes[i] = pdfBinary.charCodeAt(i)
      }

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes })
      const pdf = await loadingTask.promise
      const firstPage = await pdf.getPage(1)

      const viewportRect = viewportRef.value.getBoundingClientRect()
      const availableWidth = viewportRect.width
      const unscaledViewport = firstPage.getViewport({ scale: 1 })
      const fitToWidthScale = (availableWidth * 0.9) / unscaledViewport.width
      const scale = Math.min(fitToWidthScale, 2)

      await renderInitialPdfPages(pdf, scale)
      isPdfRendered.value = true
    } catch (error) {
      logger.error('Failed to render PDF', error)
      if (pdfContainer.value) {
        pdfContainer.value.innerHTML = '<p style="color: red;">Error: Failed to load PDF.</p>'
      }
    }
  }

  // Expose the state and methods to be used by the component.
  return {
    pageDetails,
    originalPdfDimensions,
    firstCanvasRef,
    initialPdfScale,
    isPdfRendered,
    loadAndRenderPdf,
  }
}
