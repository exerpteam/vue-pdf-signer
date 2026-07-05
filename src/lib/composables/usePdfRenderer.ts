import { ref, markRaw, type Ref, watch, onBeforeUnmount, onScopeDispose } from 'vue'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'
import { logger, isDebug } from '../utils/debug'
import { getIosMajorVersion } from '../utils/device-detection'
import { useDebugLogger } from './useDebugLogger'
import {
  statsCanvasCreated,
  statsDocCreated,
  statsDocDestroyed,
  statsLoadingTaskDestroyed,
  statsLoadingTaskStarted,
  statsRenderTaskCancelled,
  statsRenderTaskCompleted,
  statsRenderTaskStarted,
} from '../utils/pdfSignerStats'

import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.js?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const DPR = Math.min(window.devicePixelRatio || 1, 2)
const HIGH_RES_SCALE_FACTOR = DPR > 1 ? 2 : 4

// Cap on the canvas backing store, in pixels, scaled linearly by DPR.
// 8_388_608 px (2^23) ≈ 32 MiB of RGBA per canvas at DPR 1. Uncapped, a fitted
// A4 page at the fixed 4x factor allocated 22-27M px (~90-103 MiB of native,
// off-JS-heap memory) per render. The cap still leaves ~2.5x supersampling over
// the displayed size, and the render scale never drops below display resolution.
const MAX_CANVAS_AREA = 8_388_608 * DPR

function isRenderingCancelled(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'RenderingCancelledException'
}

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

  // pdf.js resources owned by the current load; torn down on doc switch and
  // unmount. The generation counter invalidates async completions of a
  // superseded load so they cannot resurrect state after teardown.
  let activeLoadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
  let activeRenderTask: pdfjsLib.RenderTask | null = null
  let loadGeneration = 0

  /**
   * Zeroing the dimensions releases each canvas's native backing store
   * immediately instead of waiting for GC of the detached element.
   */
  function releaseRenderedCanvases() {
    for (const renderedPage of renderedPages.value) {
      renderedPage.canvas.width = 0
      renderedPage.canvas.height = 0
    }
    renderedPages.value = []
    firstCanvasRef.value = null
  }

  /** Destroys the pdf.js loading task + document and cancels in-flight rendering. */
  function teardownPdfResources() {
    loadGeneration++
    if (activeRenderTask) {
      activeRenderTask.cancel()
      activeRenderTask = null
    }
    const loadingTask = activeLoadingTask
    const hadDocument = pdfDocumentRef.value !== null
    activeLoadingTask = null
    pdfDocumentRef.value = null
    if (loadingTask) {
      // destroy() also tears down the document proxy and its worker transport;
      // the returned promise only signals completion.
      loadingTask.destroy().catch(() => {})
      statsLoadingTaskDestroyed()
      if (hadDocument) {
        statsDocDestroyed()
      }
    }
    releaseRenderedCanvases()
  }

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
    const iosMajorVersion = getIosMajorVersion()
    const dynamicScaleFactor =
      iosMajorVersion !== null && iosMajorVersion <= 16 ? 1.5 : HIGH_RES_SCALE_FACTOR

    // DPR is folded into the render scale (instead of a canvas transform) so the
    // pixel budget can bound the true backing-store size in one place. The scale
    // never exceeds the requested supersampling and never drops below display
    // resolution, even for page sizes where the budget would imply it.
    const requestedRenderScale = scale * dynamicScaleFactor * DPR
    const displayRenderScale = scale * DPR
    const pageArea = unscaledViewport.width * unscaledViewport.height
    const budgetScale = Math.sqrt(MAX_CANVAS_AREA / pageArea)
    const renderScale = Math.min(requestedRenderScale, Math.max(budgetScale, displayRenderScale))

    const renderViewport = page.getViewport({ scale: renderScale })
    const displayViewport = page.getViewport({ scale })

    releaseRenderedCanvases()
    pdfContainer.value.innerHTML = ''

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    canvas.style.display = 'block'
    canvas.style.margin = '0 auto 1rem auto'
    canvas.width = Math.floor(renderViewport.width)
    canvas.height = Math.floor(renderViewport.height)
    canvas.style.width = `${Math.floor(displayViewport.width)}px`
    canvas.style.height = `${Math.floor(displayViewport.height)}px`
    statsCanvasCreated(canvas.width, canvas.height)

    if (pageNumber === 1) {
      firstCanvasRef.value = canvas
    }

    pdfContainer.value.appendChild(canvas)

    const renderContext = {
      canvasContext: context,
      viewport: renderViewport,
      canvas,
    }

    const renderTask = page.render(renderContext)
    activeRenderTask = renderTask
    statsRenderTaskStarted()
    try {
      await renderTask.promise
      statsRenderTaskCompleted()
    } catch (error) {
      if (isRenderingCancelled(error)) {
        statsRenderTaskCancelled()
      }
      throw error
    } finally {
      if (activeRenderTask === renderTask) {
        activeRenderTask = null
      }
    }

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

    // Tear down the previous document's resources before loading the new one,
    // and pin the generation so completions of a superseded load are dropped.
    teardownPdfResources()
    const generation = loadGeneration

    // Reset state before rendering a new PDF
    pdfContainer.value.innerHTML = ''
    isPdfRendered.value = false
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
      statsLoadingTaskStarted()
      activeLoadingTask = loadingTask
      const pdf = await loadingTask.promise
      if (generation !== loadGeneration) return
      statsDocCreated()
      pdfDocumentRef.value = markRaw(pdf)
      totalPages.value = pdf.numPages
      const firstPage = await pdf.getPage(1)
      if (generation !== loadGeneration) return

      const viewportRect = viewportRef.value.getBoundingClientRect()
      const availableWidth = viewportRect.width
      const unscaledViewport = firstPage.getViewport({ scale: 1 })
      const fitToWidthScale = (availableWidth * 0.9) / unscaledViewport.width
      const scale = Math.min(fitToWidthScale, 2)

      initialPdfScale.value = scale
      await renderPage(1)
      if (generation !== loadGeneration) return
      isPdfRendered.value = true
    } catch (error) {
      if (generation !== loadGeneration || isRenderingCancelled(error)) {
        // Intentional teardown or supersession mid-flight — not an error.
        return
      }
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

  // Registered at composable-call time, so this runs before the component's own
  // unmount hooks; onScopeDispose is the safety net for non-component scopes.
  onBeforeUnmount(teardownPdfResources)

  onScopeDispose(() => {
    teardownPdfResources()
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
      if (isRenderingCancelled(error)) return
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
