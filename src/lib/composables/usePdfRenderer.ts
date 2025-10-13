import { ref, markRaw, type Ref, watch, onScopeDispose } from 'vue'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'
import { logger, isDebug } from '../utils/debug'
import { useDebugLogger } from './useDebugLogger'

import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.js?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const DPR = Math.min(window.devicePixelRatio || 1, 2)
const HIGH_RES_SCALE_FACTOR = DPR > 1 ? 2 : 4

/**
 * interface to create a clear data structure
 * for each rendered page, which we need in the overlay composable.
 */
export interface RenderedPage {
  pageNum: number
  canvas: HTMLCanvasElement
  originalWidth: number
  originalHeight: number
}

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
  const renderedPages = ref<RenderedPage[]>([])
  const originalPdfDimensions = ref({ width: 0, height: 0 })
  const firstCanvasRef = ref<HTMLCanvasElement | null>(null)
  const initialPdfScale = ref(1)
  const isPdfRendered = ref(false)
  const currentPageNumber = ref(1)
  const totalPages = ref(0)
  const pdfDocumentRef = ref<pdfjsLib.PDFDocumentProxy | null>(null)
  // --- END: Reactive State ---
  const { log } = useDebugLogger()
  let resizeObserver: ResizeObserver | null = null

  function teardownResizeObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  function logPdfContainerDimensions(reason: string) {
    if (!isDebug.value || !pdfContainer.value) {
      return
    }

    log(`pdfContainer ${reason}`, {
      clientWidth: pdfContainer.value.clientWidth,
      clientHeight: pdfContainer.value.clientHeight,
    })
  }

  function setupResizeObserver() {
    if (!isDebug.value || !pdfContainer.value || typeof ResizeObserver === 'undefined') {
      return
    }

    teardownResizeObserver()

    resizeObserver = new ResizeObserver(() => {
      logPdfContainerDimensions('ResizeObserver update')
    })

    resizeObserver.observe(pdfContainer.value)
  }

  /**
   * Render a single PDF page onto the container.
   */
  async function renderPage(pageNumber: number) {
    if (!pdfContainer.value || !pdfDocumentRef.value) return

    const pdf = pdfDocumentRef.value

    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      logger.warn(`Requested page ${pageNumber} is out of bounds.`)
      return
    }

    const page = await pdf.getPage(pageNumber)
    const unscaledViewport = page.getViewport({ scale: 1 })
    const scale = initialPdfScale.value || 1
    const highResViewport = page.getViewport({ scale: scale * HIGH_RES_SCALE_FACTOR })
    const displayViewport = page.getViewport({ scale })

    pdfContainer.value.innerHTML = ''
    renderedPages.value = []

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    canvas.style.display = 'block'
    canvas.style.margin = '0 auto 1rem auto'
    canvas.width = Math.floor(highResViewport.width * DPR)
    canvas.height = Math.floor(highResViewport.height * DPR)
    canvas.style.width = `${Math.floor(displayViewport.width)}px`
    canvas.style.height = `${Math.floor(displayViewport.height)}px`

    if (pageNumber === 1) {
      firstCanvasRef.value = canvas
    }

    pdfContainer.value.appendChild(canvas)

    const renderContext = {
      canvasContext: context,
      viewport: highResViewport,
      transform: DPR !== 1 ? [DPR, 0, 0, DPR, 0, 0] : undefined,
      canvas,
    }

    await page.render(renderContext).promise

    originalPdfDimensions.value = {
      width: unscaledViewport.width,
      height: unscaledViewport.height,
    }

    renderedPages.value = [
      {
        pageNum: pageNumber,
        canvas: markRaw(canvas),
        originalWidth: unscaledViewport.width,
        originalHeight: unscaledViewport.height,
      },
    ]
  }

  /**
   * Main function to load a PDF from base64 data, render it, and set up interactions.
   */
  async function loadAndRenderPdf(pdfData: string) {
    if (!pdfData || !pdfContainer.value || !viewportRef.value) return

    // Reset state before rendering a new PDF
    pdfContainer.value.innerHTML = ''
    renderedPages.value = []
    isPdfRendered.value = false
    pdfDocumentRef.value = null
    totalPages.value = 0
    currentPageNumber.value = 1
    teardownResizeObserver()

    try {
      const pdfBinary = atob(pdfData)
      const pdfBytes = new Uint8Array(pdfBinary.length)
      for (let i = 0; i < pdfBinary.length; i++) {
        pdfBytes[i] = pdfBinary.charCodeAt(i)
      }

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes, isEvalSupported: false })
      const pdf = await loadingTask.promise
      pdfDocumentRef.value = markRaw(pdf)
      totalPages.value = pdf.numPages
      const firstPage = await pdf.getPage(1)

      const viewportRect = viewportRef.value.getBoundingClientRect()
      const availableWidth = viewportRect.width
      const unscaledViewport = firstPage.getViewport({ scale: 1 })
      const fitToWidthScale = (availableWidth * 0.9) / unscaledViewport.width
      const scale = Math.min(fitToWidthScale, 2)

      initialPdfScale.value = scale
      await renderPage(1)
      isPdfRendered.value = true
    } catch (error) {
      logger.error('Failed to render PDF', error)
      if (pdfContainer.value) {
        pdfContainer.value.innerHTML = '<p style="color: red;">Error: Failed to load PDF.</p>'
      }
    }
  }

  watch(
    isPdfRendered,
    (rendered) => {
      if (!rendered) {
        teardownResizeObserver()
        return
      }

      if (!isDebug.value) {
        return
      }

      logPdfContainerDimensions('rendered')
      setupResizeObserver()
    },
    { flush: 'post' },
  )

  watch(
    () => isDebug.value,
    (enabled) => {
      if (!enabled) {
        teardownResizeObserver()
        return
      }

      if (isPdfRendered.value) {
        logPdfContainerDimensions('debug enabled')
        setupResizeObserver()
      }
    },
  )

  onScopeDispose(() => {
    teardownResizeObserver()
  })

  async function changePage(pageNumber: number) {
    if (!pdfDocumentRef.value) return
    if (pageNumber === currentPageNumber.value) return
    if (pageNumber < 1 || pageNumber > totalPages.value) {
      logger.warn(`changePage: requested page ${pageNumber} is out of bounds.`)
      return
    }

    try {
      await renderPage(pageNumber)
      currentPageNumber.value = pageNumber
    } catch (error) {
      logger.error(`Failed to render page ${pageNumber}`, error)
    }
  }

  // Expose the state and methods to be used by the component.
  return {
    renderedPages,
    originalPdfDimensions,
    firstCanvasRef,
    initialPdfScale,
    isPdfRendered,
    currentPageNumber,
    totalPages,
    loadAndRenderPdf,
    changePage,
  }
}
