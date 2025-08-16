<script setup lang="ts">
import {
  ref,
  watch,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  markRaw,
  watchEffect,
} from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import SignaturePadModal from './SignaturePadModal.vue'
import { useScrollLock } from '@vueuse/core'
import Panzoom from '@panzoom/panzoom'
import type { PanzoomObject } from '@panzoom/panzoom'
import { isDebug, logger } from '../utils/debug'

// Set the worker source for pdfjs-dist
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PanzoomEventDetail {
  scale: number
  x: number
  y: number
  originalEvent?: Event
}

interface PanzoomEvent extends CustomEvent {
  detail: PanzoomEventDetail
}

interface SignaturePlacement {
  left: number
  top: number
  width: number
  height: number
  page: number
}

interface FinishPayload {
  signedDocument: {
    type: 'application/pdf'
    data: string
  }
  signatureImage: {
    type: 'image/png'
    data: string
  }
}

const props = withDefaults(
  defineProps<{
    pdfData: string
    signatureData?: SignaturePlacement[]
    isDownload?: boolean
    translations?: Record<string, string>
    enableZoom?: boolean
    debug?: boolean
    showSignatureBounds?: boolean
  }>(),
  {
    isDownload: false,
    enableZoom: true,
    signatureData: () => [],
    translations: () => ({}),
    debug: false,
    showSignatureBounds: false,
  },
)

watchEffect(() => {
  isDebug.value = props.debug
})

defineEmits<{
  (e: 'finish', payload: FinishPayload): void
}>()

// --- START: Panzoom & Rendering State ---
const panzoom = ref<PanzoomObject | null>(null)
const currentZoom = ref(1)
const zoomPercentage = computed(() => Math.round(currentZoom.value * 100))
// we'll pre-render the canvas at a higher resolution
// determined by the max zoom level to keep text crisp.
const MAX_ZOOM_LEVEL = 4
const HIGH_RES_SCALE_FACTOR = MAX_ZOOM_LEVEL

const DPR = Math.min(window.devicePixelRatio || 1, 2)
// --- END: Panzoom & Rendering State ---

// --- START: Signature State ---
const signatureContent = ref<{ viewBox: string; paths: string[] } | null>(null)
const isSignaturePadOpen = ref(false)
const originalPdfDimensions = ref({ width: 0, height: 0 })
const bodyEl = document.querySelector('body')
const isLocked = useScrollLock(bodyEl)

// PDF standard is typically 72 DPI, but web standard is 96 DPI
// Let's use the PDF standard for more accurate positioning
const PDF_DPI = 72
const CM_TO_INCH = 1 / 2.54
const CM_TO_PX = PDF_DPI * CM_TO_INCH // This gives us ~28.346 pixels per cm at 72 DPI

logger.debug('Conversion factors calculated', {
  CM_TO_PX,
  fiveCmInPx: 5 * CM_TO_PX,
  sevenCmInPx: 7 * CM_TO_PX,
})

// Default signature placement (in cm, then converted to px)
const defaultSignaturePlacement = computed(() => ({
  left: 5 * CM_TO_PX, // 5cm
  top: 7 * CM_TO_PX, // 7cm
  width: 8 * CM_TO_PX, // 8cm
  height: 4 * CM_TO_PX, // 4cm
  page: 1,
}))

const signatureWrapperStyle = computed(() => {
  // Start with the positioning styles from our other computed prop.
  const baseStyle = signatureStyle.value

  // If the prop is true, merge in the visual bounds styles.
  if (props.showSignatureBounds) {
    return {
      ...baseStyle,
      border: '2px dashed rgba(0, 123, 255, 0.5)',
      backgroundColor: 'rgba(0, 123, 255, 0.05)',
    }
  }

  // Otherwise, just return the positioning styles.
  return baseStyle
})

// Store the initial scale of the PDF for proper signature scaling
const initialPdfScale = ref(1)
// Store reference to first canvas for positioning
const firstCanvasRef = ref<HTMLCanvasElement | null>(null)

// Add current canvas dimensions reactive ref
const currentCanvasDimensions = ref({ width: 0, height: 0 })

// Track container dimensions reactively
const containerDimensions = ref({ width: 0, height: 0 })

const signatureSvg = ref<string | null>(null)

// Add ResizeObserver reference - use let instead of const
let resizeObserver: ResizeObserver | null = null
// --- END: Signature State ---

function openSignaturePad() {
  isSignaturePadOpen.value = true
  isLocked.value = true
}

function handleSignatureSave(svg: string) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const el = doc.querySelector('svg')
  if (!el) {
    signatureSvg.value = null
    isSignaturePadOpen.value = false
    isLocked.value = false
    return
  }

  // Normalize so it scales with our wrapper
  const w = parseFloat(el.getAttribute('width') || '')
  const h = parseFloat(el.getAttribute('height') || '')
  if (!el.hasAttribute('viewBox') && Number.isFinite(w) && Number.isFinite(h)) {
    el.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }
  el.removeAttribute('width')
  el.removeAttribute('height')
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet')

  // Optional: ensure stroke styling is present but DO NOT touch stroke-widths
  el.querySelectorAll('path').forEach((p) => {
    if (!p.getAttribute('stroke')) p.setAttribute('stroke', '#000080')
    if (!p.getAttribute('stroke-linecap')) p.setAttribute('stroke-linecap', 'round')
    if (!p.getAttribute('stroke-linejoin')) p.setAttribute('stroke-linejoin', 'round')
  })

  signatureSvg.value = new XMLSerializer().serializeToString(el)
  isSignaturePadOpen.value = false
  isLocked.value = false
}

function handleSignatureCancel() {
  isSignaturePadOpen.value = false
  isLocked.value = false
}

const t = computed(() => {
  const hasSignature = !!signatureContent.value
  return {
    actionButton: hasSignature
      ? props.translations?.updateSignature || 'Update Signature'
      : props.translations?.drawSignature || 'Draw Signature',
    save: props.translations?.save || 'Save',
  }
})

const pdfContainer = ref<HTMLDivElement | null>(null)
const panzoomContainer = ref<HTMLDivElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)
const pageDetails = ref<Array<{ page: pdfjsLib.PDFPageProxy; canvas: HTMLCanvasElement }>>([])

// --- START: Core Functions ---

/**
 * Renders the PDF for the first time, creating high-resolution canvas elements
 * that are visually scaled down.
 */
async function renderInitialPdfPages(pdf: pdfjsLib.PDFDocumentProxy, initialScale: number) {
  if (!pdfContainer.value) return

  // Store the initial scale for signature positioning
  initialPdfScale.value = initialScale

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)

    // Get the unscaled viewport to store original dimensions
    const unscaledViewport = page.getViewport({ scale: 1 })

    // Store original dimensions from first page
    if (pageNum === 1) {
      originalPdfDimensions.value = {
        width: unscaledViewport.width,
        height: unscaledViewport.height,
      }

      logger.debug('Original PDF Dimensions', {
        width: unscaledViewport.width,
        height: unscaledViewport.height,
        widthCm: (unscaledViewport.width / PDF_DPI) * 2.54,
        heightCm: (unscaledViewport.height / PDF_DPI) * 2.54,
      })
    }

    // 1. `highResViewport` for the actual canvas drawing (for crispness).
    // 2. `displayViewport` for the CSS styling (for correct initial size).
    const highResViewport = page.getViewport({ scale: initialScale * HIGH_RES_SCALE_FACTOR })
    const displayViewport = page.getViewport({ scale: initialScale })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    canvas.style.display = 'block'
    canvas.style.margin = '0 auto 1rem auto' // Ensure centering

    // Set the canvas *buffer* size to the high-resolution dimensions.
    canvas.width = Math.floor(highResViewport.width * DPR)
    canvas.height = Math.floor(highResViewport.height * DPR)

    // Set the canvas *display* size to the standard-resolution dimensions.
    canvas.style.width = `${Math.floor(displayViewport.width)}px`
    canvas.style.height = `${Math.floor(displayViewport.height)}px`

    // Store reference to first canvas for positioning
    if (pageNum === 1) {
      firstCanvasRef.value = canvas

      // Initialize current canvas dimensions
      currentCanvasDimensions.value = {
        width: Math.floor(displayViewport.width),
        height: Math.floor(displayViewport.height),
      }

      logger.debug('First Page Canvas Details', {
        displayWidth: Math.floor(displayViewport.width),
        displayHeight: Math.floor(displayViewport.height),
        scale: initialScale,
        originalPdfWidth: originalPdfDimensions.value.width,
        originalPdfHeight: originalPdfDimensions.value.height,
        viewport: {
          width: displayViewport.width,
          height: displayViewport.height,
        },
        canvasElement: canvas,
      })
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

  // Set up resize observer for the container
  if (pdfContainer.value) {
    logger.debug('Setting up container resize observer')
    setupContainerResizeObserver()

    // Initialize container dimensions
    containerDimensions.value = {
      width: pdfContainer.value.clientWidth,
      height: pdfContainer.value.clientHeight,
    }
  }
}

/**
 * Sets up a ResizeObserver to track container size changes
 */
function setupContainerResizeObserver() {
  logger.debug('setupContainerResizeObserver called', {
    hasContainer: !!pdfContainer.value,
    containerElement: pdfContainer.value,
  })

  if (!pdfContainer.value) {
    logger.debug('No container to observe, returning')
    return
  }

  // Clean up existing observer if any
  if (resizeObserver) {
    logger.debug('Cleaning up existing ResizeObserver')
    resizeObserver.disconnect()
    resizeObserver = null
  }

  logger.debug('Creating new ResizeObserver for container')
  resizeObserver = new ResizeObserver((entries) => {
    logger.debug('Container ResizeObserver fired', { entriesCount: entries.length })

    for (const entry of entries) {
      const container = entry.target as HTMLElement
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight

      logger.debug('Container ResizeObserver entry', {
        target: container,
        contentRect: entry.contentRect,
        clientWidth: newWidth,
        clientHeight: newHeight,
        currentDimensions: containerDimensions.value,
      })

      // Only update if dimensions actually changed
      if (
        newWidth !== containerDimensions.value.width ||
        newHeight !== containerDimensions.value.height
      ) {
        const oldDimensions = { ...containerDimensions.value }

        containerDimensions.value = {
          width: newWidth,
          height: newHeight,
        }

        logger.debug('Container dimensions updated', {
          old: oldDimensions,
          new: { width: newWidth, height: newHeight },
        })
      } else {
        logger.debug('Container dimensions unchanged')
      }
    }
  })

  logger.debug('Observing container', pdfContainer.value)
  resizeObserver.observe(pdfContainer.value)
  logger.debug('Container ResizeObserver setup complete')
}

/**
 * Checks if the content is overflowing the viewport and enables/disables panning.
 */
function updatePanState() {
  if (!panzoom.value || !panzoomContainer.value || !viewportRef.value) return
  const pz = panzoom.value
  const contentRect = panzoomContainer.value.getBoundingClientRect()
  const viewportRect = viewportRef.value.getBoundingClientRect()

  // Check if content is smaller than viewport in either dimension
  const fitsHorizontally = contentRect.width <= viewportRect.width
  const fitsVertically = contentRect.height <= viewportRect.height

  if (fitsHorizontally && fitsVertically) {
    // Content fits entirely - disable panning and center it
    pz.setOptions({ disablePan: true })
    pz.pan(0, 0, { animate: false })
  } else {
    // Content overflows - enable panning with boundaries
    pz.setOptions({
      disablePan: false,
      contain: 'outside', // Ensure edges can't be dragged past viewport edges
    })
  }
}

/**
 * Zoom in by a controlled increment (25% relative to current scale)
 */
function zoomIn() {
  if (!panzoom.value || !viewportRef.value) return

  // since panzoom handles maxScale, we just need to calculate
  // the target scale and let panzoom apply it. It will automatically clamp at the max.
  const newScale = panzoom.value.getScale() * 1.25

  const viewportRect = viewportRef.value.getBoundingClientRect()
  const centerX = viewportRect.width / 2
  const centerY = viewportRect.height / 2

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  panzoom.value.zoomToPoint(newScale, { clientX: centerX, clientY: centerY } as any, {
    animate: true,
  })
}

/**
 * Zoom out by a controlled increment (20% relative to current scale)
 */
function zoomOut() {
  if (!panzoom.value || !viewportRef.value) return

  // Same simplification for zooming out.
  const newScale = panzoom.value.getScale() * 0.8

  const viewportRect = viewportRef.value.getBoundingClientRect()
  const centerX = viewportRect.width / 2
  const centerY = viewportRect.height / 2

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  panzoom.value.zoomToPoint(newScale, { clientX: centerX, clientY: centerY } as any, {
    animate: true,
  })
}

/**
 * Initializes Panzoom and attaches event listeners.
 */
function initPanzoom() {
  if (!panzoomContainer.value || !viewportRef.value) return
  panzoom.value?.destroy()

  const pz = Panzoom(panzoomContainer.value, {
    maxScale: MAX_ZOOM_LEVEL,
    minScale: 0.1,
    canvas: true,
    overflow: 'hidden',
    contain: 'outside',
    startScale: 1,
  })

  viewportRef.value.addEventListener('wheel', pz.zoomWithWheel, { passive: false })

  // Prevent gesture "leaking" on mobile by stopping event propagation.
  panzoomContainer.value.addEventListener('panzoomstart', (e) => {
    e.preventDefault()
  })

  // On every zoom, update our reactive state for the UI.
  panzoomContainer.value.addEventListener('panzoomzoom', (e) => {
    const event = e as PanzoomEvent
    currentZoom.value = event.detail.scale
  })

  // After any interaction, update the pan boundaries.
  panzoomContainer.value.addEventListener('panzoomend', () => {
    updatePanState()
  })

  panzoom.value = pz
}

/**
 * Main function to load a PDF, render it, and set up interactions.
 */
async function loadAndRenderPdf(pdfData: string) {
  if (!pdfData || !pdfContainer.value || !viewportRef.value) return

  panzoom.value?.destroy()
  panzoom.value = null
  pdfContainer.value.innerHTML = ''
  pageDetails.value = []

  try {
    const pdfBinary = atob(pdfData)
    const pdfBytes = new Uint8Array(pdfBinary.length)
    for (let i = 0; i < pdfBinary.length; i++) {
      pdfBytes[i] = pdfBinary.charCodeAt(i)
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes })
    const pdf = await loadingTask.promise

    const firstPage = await pdf.getPage(1)

    // Get the actual available width from the viewport element
    // This accounts for padding and ensures we're measuring the right container
    const viewportRect = viewportRef.value.getBoundingClientRect()
    const availableWidth = viewportRect.width

    // Get the PDF's natural dimensions
    const unscaledViewport = firstPage.getViewport({ scale: 1 })

    // Calculate scale to fit width with some padding (90% of available width)
    // This ensures margins are visible on both sides
    const fitToWidthScale = (availableWidth * 0.9) / unscaledViewport.width

    // Use a reasonable initial scale (not too small, not too large)
    const initialScale = Math.min(fitToWidthScale, 2) // Cap at 2x to avoid overly large initial renders

    await renderInitialPdfPages(pdf, initialScale)

    await nextTick()
    initPanzoom()
    updatePanState()
  } catch (error) {
    logger.error('Failed to render PDF', error)
    if (pdfContainer.value) {
      pdfContainer.value.innerHTML = '<p style="color: red;">Error: Failed to load PDF.</p>'
    }
  }
}

// Computed style for signature positioning
const signatureStyle = computed(() => {
  if (!firstCanvasRef.value || !pdfContainer.value || originalPdfDimensions.value.width === 0) {
    return { display: 'none' }
  }

  const placement = defaultSignaturePlacement.value

  // Use the fixed canvas dimensions
  const canvasWidth = currentCanvasDimensions.value.width
  const canvasHeight = currentCanvasDimensions.value.height

  // Calculate the current scale based on the ACTUAL original PDF dimensions
  // Instead of hardcoding 595, use the actual original width
  const currentScale = canvasWidth / originalPdfDimensions.value.width

  // Use the reactive container dimensions
  const containerWidth = containerDimensions.value.width || pdfContainer.value.clientWidth
  const containerPadding = 16 // 1rem padding on each side (from .pdf-render-view padding)

  // Calculate the actual left offset of the canvas within the container
  // The canvas is centered, so we need to account for that
  const canvasLeftOffset = Math.max(0, (containerWidth - canvasWidth) / 2)

  // Calculate signature dimensions and position using current scale
  const signatureLeft = placement.left * currentScale
  const signatureTop = placement.top * currentScale
  const signatureWidth = placement.width * currentScale
  const signatureHeight = placement.height * currentScale

  // Final position includes canvas offset
  const finalLeft = canvasLeftOffset + signatureLeft
  const finalTop = signatureTop + containerPadding // Add top padding of container

  // Debug logging
  logger.debug('Signature Positioning Calculation', {
    placement: {
      leftCm: placement.left / CM_TO_PX,
      topCm: placement.top / CM_TO_PX,
      widthCm: placement.width / CM_TO_PX,
      heightCm: placement.height / CM_TO_PX,
    },
    pixelValues: {
      left: placement.left,
      top: placement.top,
      width: placement.width,
      height: placement.height,
    },
    canvas: {
      width: canvasWidth,
      height: canvasHeight,
      currentScale,
      originalWidth: originalPdfDimensions.value.width,
      originalHeight: originalPdfDimensions.value.height,
    },
    container: {
      width: containerWidth,
      padding: containerPadding,
      reactiveWidth: containerDimensions.value.width,
    },
    offsets: {
      canvasLeftOffset,
      initialPdfScale: initialPdfScale.value,
      currentScale,
    },
    scaled: {
      signatureLeft,
      signatureTop,
      signatureWidth,
      signatureHeight,
    },
    final: {
      left: finalLeft,
      top: finalTop,
      width: signatureWidth,
      height: signatureHeight,
    },
    svgInfo: {
      viewBox: '0 0 200 160',
      preserveAspectRatio: 'xMidYMid meet',
      transform: 'translate(10, 0)',
      description: 'Signature is naturally centered at y=80, viewBox center is also y=80',
      signatureNaturalBounds: {
        xRange: [10, 180],
        yRange: [20, 140],
        center: { x: 95, y: 80 },
      },
    },
  })

  return {
    position: 'absolute' as const,
    left: `${finalLeft}px`,
    top: `${finalTop}px`,
    width: `${signatureWidth}px`,
    height: `${signatureHeight}px`,
    pointerEvents: 'none' as const,
  }
})

// --- START: Lifecycle and Watchers ---
onMounted(() => {
  loadAndRenderPdf(props.pdfData)

  // Add window resize listener for debugging
  const handleWindowResize = () => {
    logger.debug('Window resized', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    })

    if (firstCanvasRef.value) {
      logger.debug('Canvas element on window resize', {
        canvas: firstCanvasRef.value,
        styleWidth: firstCanvasRef.value.style.width,
        styleHeight: firstCanvasRef.value.style.height,
        offsetWidth: firstCanvasRef.value.offsetWidth,
        offsetHeight: firstCanvasRef.value.offsetHeight,
        clientWidth: firstCanvasRef.value.clientWidth,
        clientHeight: firstCanvasRef.value.clientHeight,
      })

      // Manually update dimensions to see if this works
      const newWidth = parseInt(firstCanvasRef.value.style.width)
      const newHeight = parseInt(firstCanvasRef.value.style.height)

      if (
        newWidth !== currentCanvasDimensions.value.width ||
        newHeight !== currentCanvasDimensions.value.height
      ) {
        logger.debug('Manual dimension update on window resize', {
          old: currentCanvasDimensions.value,
          new: { width: newWidth, height: newHeight },
        })
        currentCanvasDimensions.value = {
          width: newWidth,
          height: newHeight,
        }
      }
    }

    if (pdfContainer.value) {
      logger.debug('PDF container on window resize', {
        clientWidth: pdfContainer.value.clientWidth,
        clientHeight: pdfContainer.value.clientHeight,
        offsetWidth: pdfContainer.value.offsetWidth,
        offsetHeight: pdfContainer.value.offsetHeight,
      })
    }
  }

  window.addEventListener('resize', handleWindowResize)

  // Store the cleanup function
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleWindowResize)
  })
})
watch(
  () => props.pdfData,
  (newPdfData, oldPdfData) => {
    if (newPdfData !== oldPdfData) {
      loadAndRenderPdf(newPdfData)
    }
  },
)

onBeforeUnmount(() => {
  panzoom.value?.destroy()
  // Clean up resize observer
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<template>
  <div class="vue-pdf-signer" @touchstart.stop @touchmove.stop @wheel.stop>
    <div class="pdf-signer-toolbar">
      <div class="toolbar-group">
        <button @click="openSignaturePad" class="btn btn-secondary">{{ t.actionButton }}</button>
        <button class="btn btn-primary" :disabled="!signatureContent">{{ t.save }}</button>
      </div>
      <div
        v-if="props.enableZoom"
        class="toolbar-group"
        @touchstart.stop
        @touchmove.stop
        @wheel.stop
      >
        <button @click="zoomOut" class="btn btn-icon">-</button>
        <span class="zoom-level">{{ zoomPercentage }}%</span>
        <button @click="zoomIn" class="btn btn-icon">+</button>
      </div>
    </div>

    <div ref="viewportRef" class="pdf-viewport">
      <div ref="panzoomContainer" class="panzoom-container">
        <div ref="pdfContainer" class="pdf-render-view">
          <!-- PDF pages will be rendered here as canvas elements -->
        </div>

        <!-- Signature overlay -->
        <div v-if="signatureSvg" class="signature-overlay">
          <div :style="signatureWrapperStyle" class="signature-wrapper" v-html="signatureSvg"></div>
        </div>
      </div>
    </div>

    <SignaturePadModal
      v-if="isSignaturePadOpen"
      @close="handleSignatureCancel"
      @save="handleSignatureSave"
    />
  </div>
</template>

<style scoped>
.vue-pdf-signer {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f5f5f5;
  height: 100%;
  min-height: 400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.pdf-signer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pdf-viewport {
  flex-grow: 1;
  overflow: auto;
  padding: 1rem 0;
}

.panzoom-container {
  transform-origin: top left;
  position: relative;
  display: inline-block;
  min-width: 100%;
}

.pdf-render-view {
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100%;
}

/* Keep the nice shadow for the canvas elements */
.pdf-render-view canvas {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  display: block;
  margin: 0 auto 1rem auto;
}

/* Signature overlay styles */
.signature-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.signature-wrapper {
  border-radius: 4px;
  box-sizing: border-box;
}

.signature-wrapper svg {
  display: block;
}

.btn {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #fff;
  color: #333;
}
.btn:hover {
  border-color: #999;
  background-color: #f8f8f8;
}
.btn-primary {
  background-color: #007aff;
  color: white;
  border-color: #007aff;
}
.btn-primary:hover {
  background-color: #005ecb;
}
.btn-secondary {
  background-color: #6c757d;
  color: white;
  border-color: #6c757d;
}
.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-icon {
  width: 2rem;
  height: 2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
  background-color: #f0f0f0;
  border-color: #ddd;
  color: #444;
}
.btn-icon:hover {
  background-color: #e0e0e0;
}
.btn:disabled {
  background-color: #aeb1b4;
  border-color: #aeb1b4;
  color: #e9ecef;
  cursor: not-allowed;
}

.zoom-level {
  min-width: 4ch;
  padding: 0 0.25rem;
  text-align: center;
  font-weight: 500;
  font-size: 0.9rem;
  color: #333;
  user-select: none;
}

/* Mobile-specific adjustments */
@media (max-width: 768px) {
  .pdf-render-view {
    padding: 1rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .pdf-signer-toolbar {
    padding: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .toolbar-group {
    gap: 0.25rem;
  }
  .btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }
  .btn-icon {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 1rem;
  }
}
</style>
