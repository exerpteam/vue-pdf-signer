<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { computed } from 'vue'

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

const props = defineProps<{
  pdfData: string
  signatureData?: SignaturePlacement[]
  isDownload?: boolean
  translations?: Record<string, string>
  enableZoom?: boolean
}>()

defineEmits<{
  (e: 'finish', payload: FinishPayload): void
}>()

const t = computed(() => {
  return {
    updateSignature: props.translations?.updateSignature || 'Update Signature',
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
        <button class="btn btn-secondary">{{ t.updateSignature }}</button>
        <button class="btn btn-primary">{{ t.save }}</button>
      </div>
      <div v-if="props.enableZoom" class="toolbar-group">
        <button class="btn btn-icon">-</button>
        <span class="zoom-level">100%</span>
        <button class="btn btn-icon">+</button>
      </div>
    </div>

    <div class="pdf-viewport">
      <!-- ✍️ The ref is now on this inner container. This will be important for transforms. -->
      <div ref="pdfContainer" class="pdf-render-view">
        <!-- PDF pages will be rendered here as canvas elements -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.vue-pdf-signer {
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f0f0f0; /* ✍️ Changed background for better contrast */
  height: 100%;
  min-height: 400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* ✍️ Important: overflow is now handled by the viewport */
}

.pdf-signer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #ffffff;
  border-bottom: 1px solid #ccc;
  flex-shrink: 0; /* ✍️ Prevent the toolbar from shrinking */
  position: sticky; /* ✍️ Make the toolbar stick to the top */
  top: 0;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pdf-viewport {
  flex-grow: 1; /* ✍️ The viewport will take up all available space */
  overflow: auto; /* ✍️ This is now our main scrollable area */
  padding: 1rem 0;
}

.pdf-render-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ✍️ Basic button styling */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}
.btn-primary:hover {
  background-color: #0056b3;
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
  font-size: 1.25rem;
  background-color: #f8f9fa;
  border-color: #dee2e6;
  color: #212529;
}
.btn-icon:hover {
  background-color: #e2e6ea;
}
.zoom-level {
  min-width: 4ch;
  text-align: center;
  font-weight: 500;
}
</style>
