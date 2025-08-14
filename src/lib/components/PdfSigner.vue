<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'

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
      const viewport = page.getViewport({ scale: 1.5 }) // Using a fixed scale for now.

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
  <div class="vue-pdf-signer-container">
    <!-- The ref="pdfContainer" connects this div to our script logic. -->
    <div ref="pdfContainer" class="pdf-render-view">
      <!-- PDF pages will be rendered here as canvas elements -->
    </div>
  </div>
</template>

<style scoped>
.vue-pdf-signer-container {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f8f9fa;
  min-height: 400px;
  max-height: 90vh; /* Set a max height to make it scrollable */
  overflow-y: auto; /* Enable vertical scrolling */
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pdf-render-view {
  width: 100%;
}
</style>
