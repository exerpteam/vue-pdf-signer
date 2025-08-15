<script setup lang="ts">
import { ref, watch, computed, nextTick, onBeforeUnmount, onMounted, markRaw } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import SignaturePadModal from './SignaturePadModal.vue'
import { useScrollLock } from '@vueuse/core'
import Panzoom from '@panzoom/panzoom'
import type { PanzoomObject } from '@panzoom/panzoom'

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
  }>(),
  {
    isDownload: false,
    enableZoom: true,
    signatureData: () => [],
    translations: () => ({}),
  },
)

defineEmits<{
  (e: 'finish', payload: FinishPayload): void
}>()

// --- START: Panzoom & Rendering State ---
const panzoom = ref<PanzoomObject | null>(null)
const renderScale = ref(1)
const cssScale = ref(1)
const DPR = Math.min(window.devicePixelRatio || 1, 2)
// --- END: Panzoom & Rendering State ---

const signatureSvg = ref<string | null>(null)
const isSignaturePadOpen = ref(false)
const bodyEl = document.querySelector('body')
const isLocked = useScrollLock(bodyEl)

function openSignaturePad() {
  isSignaturePadOpen.value = true
  isLocked.value = true
}
function handleSignatureSave(svg: string) {
  signatureSvg.value = svg
  isSignaturePadOpen.value = false
  isLocked.value = false
}
function handleSignatureCancel() {
  isSignaturePadOpen.value = false
  isLocked.value = false
}

const t = computed(() => {
  const hasSignature = !!signatureSvg.value
  return {
    actionButton: hasSignature
      ? props.translations?.updateSignature || 'Update Signature'
      : props.translations?.drawSignature || 'Draw Signature',
    save: props.translations?.save || 'Save',
  }
})

const zoomPercentage = computed(() => Math.round(renderScale.value * cssScale.value * 100))

const pdfContainer = ref<HTMLDivElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)
const pageDetails = ref<Array<{ page: pdfjsLib.PDFPageProxy; canvas: HTMLCanvasElement }>>([])

// --- START: Core Functions ---

/**
 * Renders the PDF for the first time, creating canvas elements.
 */
async function renderInitialPdfPages(pdf: pdfjsLib.PDFDocumentProxy, initialScale: number) {
  if (!pdfContainer.value) return
  renderScale.value = initialScale

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: renderScale.value })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    canvas.style.display = 'block'
    canvas.style.margin = '0 auto 1rem auto' // Ensure centering
    canvas.width = Math.floor(viewport.width * DPR)
    canvas.height = Math.floor(viewport.height * DPR)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    pdfContainer.value.appendChild(canvas)
    pageDetails.value.push({ page: markRaw(page), canvas })

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      transform: DPR !== 1 ? [DPR, 0, 0, DPR, 0, 0] : undefined,
      canvas: canvas,
    }
    await page.render(renderContext).promise
  }
}

/**
 * Checks if the content is overflowing the viewport and enables/disables panning.
 */
function updatePanState() {
  if (!panzoom.value || !pdfContainer.value || !viewportRef.value) return
  const pz = panzoom.value
  const contentRect = pdfContainer.value.getBoundingClientRect()
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
  const currentScale = panzoom.value.getScale()
  const effectiveScale = renderScale.value * currentScale

  console.log('➕ Zoom In:', {
    currentScale,
    renderScale: renderScale.value,
    effectiveScale,
  })

  // Don't allow zooming beyond 400% effective scale
  if (effectiveScale >= 4) {
    console.log('⛔ Max zoom reached')
    return
  }

  const newScale = Math.min(currentScale * 1.25, 4 / renderScale.value)

  console.log('➕ New scale:', newScale)

  // Get the center of the viewport as the focal point
  const viewportRect = viewportRef.value.getBoundingClientRect()
  const centerX = viewportRect.width / 2
  const centerY = viewportRect.height / 2

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  panzoom.value.zoomToPoint(newScale, { clientX: centerX, clientY: centerY } as any, {
    animate: true,
  })
}

/**
 * Zoom out by a controlled increment (25% relative to current scale)
 */
function zoomOut() {
  if (!panzoom.value || !viewportRef.value) return
  const currentScale = panzoom.value.getScale()
  const newScale = currentScale * 0.8

  console.log('➖ Zoom Out:', {
    currentScale,
    newScale,
    renderScale: renderScale.value,
  })

  // Get the center of the viewport as the focal point
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
  if (!pdfContainer.value || !viewportRef.value) return
  panzoom.value?.destroy()

  // Calculate max scale based on current render scale
  const maxAllowedScale = 4 / renderScale.value
  const minAllowedScale = 0.1

  console.log('🚀 initPanzoom:', {
    renderScale: renderScale.value,
    maxAllowedScale,
    minAllowedScale,
  })

  const pz = Panzoom(pdfContainer.value, {
    maxScale: maxAllowedScale,
    minScale: minAllowedScale,
    canvas: true,
    overflow: 'hidden',
    contain: 'outside',
    startScale: 1,
  })

  viewportRef.value.addEventListener('wheel', pz.zoomWithWheel, { passive: false })

  // Prevent gesture "leaking" on mobile by stopping event propagation.
  pdfContainer.value.addEventListener('panzoomstart', (e) => {
    e.preventDefault()
  })

  // On every zoom, update the UI and check pan boundaries
  pdfContainer.value.addEventListener('panzoomzoom', (e) => {
    const event = e as PanzoomEvent
    cssScale.value = event.detail.scale

    const effectiveScale = renderScale.value * event.detail.scale
    console.log('🔍 panzoomzoom:', {
      cssScale: event.detail.scale,
      renderScale: renderScale.value,
      effectiveScale,
    })

    // Enforce maximum effective scale
    if (effectiveScale > 4.05 && panzoom.value) {
      // Small buffer to prevent jitter
      const cappedScale = 4 / renderScale.value
      console.log('⚠️ Capping scale at max')
      panzoom.value.zoom(cappedScale, { animate: false })
      cssScale.value = cappedScale
    }

    // Update pan state after zoom to enforce boundaries
    setTimeout(() => updatePanState(), 0)
  })

  // Simple end handler - no re-rendering
  pdfContainer.value.addEventListener('panzoomend', (e) => {
    const event = e as PanzoomEvent
    console.log('🏁 panzoomend:', {
      scale: event.detail.scale,
      effectiveScale: renderScale.value * event.detail.scale,
    })

    // Just update pan constraints, no re-rendering
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
    console.error('Failed to render PDF:', error)
    if (pdfContainer.value) {
      pdfContainer.value.innerHTML = '<p style="color: red;">Error: Failed to load PDF.</p>'
    }
  }
}
// --- START: Lifecycle and Watchers ---
onMounted(() => {
  loadAndRenderPdf(props.pdfData)
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
})
</script>

<template>
  <div class="vue-pdf-signer">
    <div class="pdf-signer-toolbar">
      <div class="toolbar-group">
        <button @click="openSignaturePad" class="btn btn-secondary">{{ t.actionButton }}</button>
        <button class="btn btn-primary" :disabled="!signatureSvg">{{ t.save }}</button>
      </div>
      <div v-if="props.enableZoom" class="toolbar-group">
        <button @click="zoomOut" class="btn btn-icon">-</button>
        <span class="zoom-level">{{ zoomPercentage }}%</span>
        <button @click="zoomIn" class="btn btn-icon">+</button>
      </div>
    </div>

    <div ref="viewportRef" class="pdf-viewport">
      <div ref="pdfContainer" class="pdf-render-view">
        <!-- PDF pages will be rendered here as canvas elements -->
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

.pdf-render-view {
  transform-origin: top left;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center; /* Center the canvas elements horizontally */
  min-width: 100%; /* Ensure the container takes full width */
}

/* Keep the nice shadow for the canvas elements */
.pdf-render-view canvas {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  display: block;
  margin: 0 auto 1rem auto; /* Center with auto margins and add bottom spacing */
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
    padding: 1rem 0.5rem; /* Reduce horizontal padding on mobile but keep it symmetric */
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
