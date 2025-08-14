<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { computed } from 'vue'
import SignaturePadModal from './SignaturePadModal.vue'

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

const signatureSvg = ref<string | null>(null)
const isSignaturePadOpen = ref(false)

function openSignaturePad() {
  isSignaturePadOpen.value = true
}

function handleSignatureSave(svg: string) {
  signatureSvg.value = svg
  isSignaturePadOpen.value = false
}

function handleSignatureCancel() {
  isSignaturePadOpen.value = false
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

// watchEffect will re-run whenever its dependencies (like props.pdfData) change.
watchEffect(async () => {
  if (!props.pdfData || !pdfContainer.value) {
    return
  }

  // Clear any previously rendered pages.
  pdfContainer.value.innerHTML = ''

  try {
    // The pdfData prop is a base64 string. pdfjsLib needs a Uint8Array.
    // We decode it by first converting it to a binary string and then to a byte array.
    const pdfBinary = atob(props.pdfData)
    const pdfBytes = new Uint8Array(pdfBinary.length)
    for (let i = 0; i < pdfBinary.length; i++) {
      pdfBytes[i] = pdfBinary.charCodeAt(i)
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes })
    const pdf = await loadingTask.promise

    // Loop through each page of the PDF.
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)

      // Get the viewport at scale 1 to determine the original PDF page width.
      const unscaledViewport = page.getViewport({ scale: 1 })

      // Get the available width from our container div. We'll leave a little padding.
      const availableWidth = pdfContainer.value.clientWidth * 0.95

      // Calculate the scale required to make the PDF page fit the available width.
      const scale = availableWidth / unscaledViewport.width

      const viewport = page.getViewport({ scale }) // Use dynamic scale

      // Create a canvas for each page.
      const canvas = document.createElement('canvas')
      canvas.style.display = 'block'
      canvas.style.marginBottom = '1rem' // Add some space between pages.
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width

      // Append the canvas to our container div.
      pdfContainer.value.appendChild(canvas)

      // Render the PDF page onto the canvas.
      const renderContext = {
        canvasContext: context!,
        viewport: viewport,
        canvas: canvas,
      }
      await page.render(renderContext).promise
    }
  } catch (error) {
    console.error('Failed to render PDF:', error)
    // Display an error message in the container.
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
  display: flex;
  flex-direction: column;
  align-items: center;
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
