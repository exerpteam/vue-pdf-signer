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
const RERENDER_UPPER_THRESHOLD = 2.0
const RERENDER_LOWER_THRESHOLD = 0.7
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

const zoomPercentage = computed(() => Math.round(cssScale.value * 100))

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
    canvas.style.margin = '0 auto 1rem auto'
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
 * Re-renders all PDF pages with a new backing scale. Now used again.
 */
async function updatePagesWithNewScale(newRenderScale: number) {
  renderScale.value = newRenderScale
  for (const detail of pageDetails.value) {
    const { page, canvas } = detail
    const viewport = page.getViewport({ scale: renderScale.value })
    const context = canvas.getContext('2d')!

    canvas.width = Math.floor(viewport.width * DPR)
    canvas.height = Math.floor(viewport.height * DPR)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    const renderContext = {
      canvasContext: context,
      viewport: page.getViewport({ scale: renderScale.value, rotation: viewport.rotation }),
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
  // Disable panning if the content is smaller than the viewport in both dimensions.
  const shouldDisablePan =
    contentRect.width <= viewportRect.width && contentRect.height <= viewportRect.height
  pz.setOptions({ disablePan: shouldDisablePan })
}

/**
 * Initializes Panzoom and attaches event listeners.
 */
function initPanzoom() {
  if (!pdfContainer.value || !viewportRef.value) return
  panzoom.value?.destroy()

  const pz = Panzoom(pdfContainer.value, {
    maxScale: 10,
    minScale: 0.1,
    canvas: true,
    overflow: 'hidden',
  })

  viewportRef.value.addEventListener('wheel', pz.zoomWithWheel, { passive: false })

  // Prevent gesture "leaking" on mobile by stopping event propagation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfContainer.value.addEventListener('panzoomstart', (e: any) => {
    e.preventDefault()
  })

  // On every zoom, just update the UI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfContainer.value.addEventListener('panzoomzoom', (e: any) => {
    cssScale.value = e.detail.scale
  })

  // Re-render for crispness AFTER the user finishes zooming.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfContainer.value.addEventListener('panzoomend', async (e: any) => {
    const pz = e.detail
    const currentCssScale = pz.getScale()
    const effectiveScale = renderScale.value * currentCssScale

    if (effectiveScale > RERENDER_UPPER_THRESHOLD || effectiveScale < RERENDER_LOWER_THRESHOLD) {
      // 1. Calculate the new backing scale for the canvas.
      const newRenderScale = Math.max(0.25, Math.min(4, effectiveScale))
      const scaleRatio = newRenderScale / renderScale.value

      // 2. Get the current pan position BEFORE re-rendering.
      const oldPan = pz.getPan()

      // 3. Re-render the canvas at the new, higher resolution.
      await updatePagesWithNewScale(newRenderScale)

      // 4. Reset Panzoom's scale and pan.
      pz.reset({ silent: true })

      // 5. Re-apply the pan, scaled to the new canvas size, to keep the user's view centered.
      pz.pan(oldPan.x * scaleRatio, oldPan.y * scaleRatio, {
        silent: true,
        animate: false,
      })

      // 6. Update the UI scale display.
      cssScale.value = 1
    }
  })
  panzoom.value = pz
}

/**
 * Main function to load a PDF, render it, and set up interactions.
 */
async function loadAndRenderPdf(pdfData: string) {
  if (!pdfData || !pdfContainer.value) return

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
    const viewportWidth = pdfContainer.value.parentElement!.clientWidth
    const unscaledViewport = firstPage.getViewport({ scale: 1 })
    const initialScale = (viewportWidth / unscaledViewport.width) * 0.98
    await renderInitialPdfPages(pdf, initialScale)

    await nextTick()
    initPanzoom()
    updatePanState() // Set initial pan state.
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
        <button @click="panzoom?.zoomOut()" class="btn btn-icon">-</button>
        <span class="zoom-level">{{ zoomPercentage }}%</span>
        <button @click="panzoom?.zoomIn()" class="btn btn-icon">+</button>
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
