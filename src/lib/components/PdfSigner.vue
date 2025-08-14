<script setup lang="ts">
import { ref, watchEffect, computed, nextTick, onBeforeUnmount } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import SignaturePadModal from './SignaturePadModal.vue'
import { useScrollLock } from '@vueuse/core'
import Panzoom from '@panzoom/panzoom'
import type { PanzoomObject } from '@panzoom/panzoom'

// Set the worker source for pdfjs-dist. This is crucial for it to work in a Vite/webpack environment.
// We are pointing to the version of the worker that comes with the installed package.
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
// This ref will hold our Panzoom instance.
const panzoom = ref<PanzoomObject | null>(null)

// This is the "logical" render scale for PDF.js, not the CSS transform scale.
const renderScale = ref(1)

// We clamp the device pixel ratio to avoid creating excessively large canvases on high-res screens.
const DPR = Math.min(window.devicePixelRatio || 1, 2)

// Re-render thresholds: If Panzoom's CSS scale pushes the effective scale
// beyond these, we trigger a re-render of the PDF's backing canvas for clarity.
const RERENDER_UPPER_THRESHOLD = 2.0
const RERENDER_LOWER_THRESHOLD = 0.6
// --- END: Panzoom & Rendering State ---

const signatureSvg = ref<string | null>(null)
const isSignaturePadOpen = ref(false)

// This composable will lock the body scroll. It's reactive.
const bodyEl = document.querySelector('body')
const isLocked = useScrollLock(bodyEl)

function openSignaturePad() {
  isSignaturePadOpen.value = true
  isLocked.value = true // Lock the scroll
}

function handleSignatureSave(svg: string) {
  signatureSvg.value = svg
  isSignaturePadOpen.value = false
  isLocked.value = false // Unlock the scroll
}

function handleSignatureCancel() {
  isSignaturePadOpen.value = false
  isLocked.value = false // Unlock the scroll
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

// This ref will hold the DOM element where we'll render our PDF pages.
const pdfContainer = ref<HTMLDivElement | null>(null)

// Clean up the Panzoom instance when the component is unmounted.
onBeforeUnmount(() => {
  panzoom.value?.destroy()
})

// watchEffect will re-run whenever its dependencies (like props.pdfData) change.
watchEffect(async () => {
  if (!props.pdfData || !pdfContainer.value) {
    return
  }

  // Reset state when a new PDF is loaded
  panzoom.value?.destroy() // Destroy any existing panzoom instance
  panzoom.value = null
  renderScale.value = 1
  pdfContainer.value.innerHTML = ''

  try {
    const pdfBinary = atob(props.pdfData)
    const pdfBytes = new Uint8Array(pdfBinary.length)
    for (let i = 0; i < pdfBinary.length; i++) {
      pdfBytes[i] = pdfBinary.charCodeAt(i)
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes })
    const pdf = await loadingTask.promise

    // This is a placeholder for our new rendering logic, which we will implement in the next step.
    // For now, it just clears the container.
    // We will replace this with the multi-page rendering loop.
  } catch (error) {
    console.error('Failed to render PDF:', error)
    pdfContainer.value.innerHTML = '<p style="color: red;">Error: Failed to load PDF.</p>'
  }
})
</script>
<template>
  <div class="vue-pdf-signer">
    <div class="pdf-signer-toolbar">
      <div class="toolbar-group">
        <!-- Button opens the modal and has dynamic text -->
        <button @click="openSignaturePad" class="btn btn-secondary">{{ t.actionButton }}</button>
        <!-- Save button is disabled until a signature is present -->
        <button class="btn btn-primary" :disabled="!signatureSvg">{{ t.save }}</button>
      </div>
      <div v-if="props.enableZoom" class="toolbar-group">
        <button class="btn btn-icon">-</button>
        <span class="zoom-level">100%</span>
        <button class="btn btn-icon">+</button>
      </div>
    </div>

    <div class="pdf-viewport">
      <div ref="pdfContainer" class="pdf-render-view">
        <!-- PDF pages will be rendered here as canvas elements -->
      </div>
    </div>

    <!-- The signature pad modal, controlled by our state -->
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
  gap: 0.5rem; /* Reduced gap for a tighter look */
}

.pdf-viewport {
  flex-grow: 1;
  overflow: auto;
  padding: 1rem 0;
}

.pdf-render-view {
  width: 100%;
  /* display: flex; */
  /* flex-direction: column; */
  /* align-items: center; */
  transform-origin: top left; /* CRITICAL: All transforms originate from here */
}

/* --- Improved Button Styles --- */
.btn {
  padding: 0.4rem 0.8rem; /* Adjusted padding */
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 0.875rem;
  font-weight: 600; /* Slightly bolder */
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
  line-height: 1; /* Ensure consistent line height */
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
  user-select: none; /* Prevent accidental selection */
}

/* --- Mobile Responsive Styles --- */
@media (max-width: 480px) {
  .pdf-signer-toolbar {
    padding: 0.5rem;
    flex-wrap: wrap; /* Allow groups to wrap if needed */
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
