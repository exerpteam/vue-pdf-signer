<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { PdfSigner, type FinishPayload } from '../lib'
import { PDF_MANIFEST, type PdfManifestEntry, type SignaturePlacement } from './pdf-manifest'

// --- START: Reactive state for our demo app ---
const pdfList = ref<PdfManifestEntry[]>(PDF_MANIFEST)
const selectedPdfFileName = ref<string>(PDF_MANIFEST[0]?.fileName || '')
const pdfData = ref<string>('')
const isLoading = ref<boolean>(false)
const output = ref<FinishPayload | null>(null)
const outputSectionRef = ref<HTMLDivElement | null>(null)

// This ref holds the editable signature data from our new input fields.
const dynamicSignatureData = ref<SignaturePlacement>({
  left: 5,
  top: 7,
  width: 8,
  height: 4,
  page: 1,
})

// The component's prop expects an array, so we wrap our dynamic object in a computed array.
const signatureDataForComponent = computed(() => [dynamicSignatureData.value])
// --- END: Reactive state ---

/**
 * Dynamically imports a PDF from the samples directory, fetches it,
 * and converts it to a base64 string.
 */
async function loadPdfAsBase64(fileName: string): Promise<string> {
  try {
    const pdfUrl = `/src/demo/samples/${fileName}`
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    }
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error(`Error loading PDF ${fileName}:`, error)
    return ''
  }
}

async function handleFinish(payload: FinishPayload) {
  console.log('Demo App received "finish" event:', payload)
  output.value = payload
  await nextTick()
  outputSectionRef.value?.scrollIntoView({ behavior: 'smooth' })
}

const signedPdfUrl = computed(() => {
  if (!output.value) return ''
  return `data:application/pdf;base64,${output.value.signedDocument.data}`
})

const signatureImageUrl = computed(() => {
  if (!output.value) return ''
  return `data:image/png;base64,${output.value.signatureImage.data}`
})

// Watch for changes in the dropdown selection.
watch(
  selectedPdfFileName,
  async (newFileName) => {
    if (!newFileName) return

    isLoading.value = true
    pdfData.value = ''

    const selectedPdf = pdfList.value.find((p) => p.fileName === newFileName)
    if (selectedPdf) {
      pdfData.value = await loadPdfAsBase64(selectedPdf.fileName)
      // When a new PDF is selected, we update our reactive ref with its default placement.
      // This automatically updates the input fields.
      dynamicSignatureData.value = { ...selectedPdf.signaturePlacement }
    }
    isLoading.value = false
  },
  { immediate: true },
)
</script>

<template>
  <header>
    <h1>Component Library Demo</h1>
    <p>This is a live demonstration of the components being built.</p>
  </header>

  <main>
    <div class="controls">
      <label for="pdf-selector">Select a Test PDF:</label>
      <select id="pdf-selector" v-model="selectedPdfFileName">
        <option v-for="pdf in pdfList" :key="pdf.fileName" :value="pdf.fileName">
          {{ pdf.name }}
        </option>
      </select>
    </div>

    <!-- START: dynamic signature controls -->
    <fieldset class="signature-controls">
      <legend>Signature Placement</legend>
      <div class="signature-controls-grid">
        <div class="input-group">
          <label for="sig-left">Left (cm)</label>
          <input
            id="sig-left"
            type="number"
            step="0.1"
            v-model.number="dynamicSignatureData.left"
          />
        </div>
        <div class="input-group">
          <label for="sig-top">Top (cm)</label>
          <input id="sig-top" type="number" step="0.1" v-model.number="dynamicSignatureData.top" />
        </div>
        <div class="input-group">
          <label for="sig-width">Width (cm)</label>
          <input
            id="sig-width"
            type="number"
            step="0.1"
            v-model.number="dynamicSignatureData.width"
          />
        </div>
        <div class="input-group">
          <label for="sig-height">Height (cm)</label>
          <input
            id="sig-height"
            type="number"
            step="0.1"
            v-model.number="dynamicSignatureData.height"
          />
        </div>
        <div class="input-group">
          <label for="sig-page">Page</label>
          <input
            id="sig-page"
            type="number"
            step="1"
            min="1"
            v-model.number="dynamicSignatureData.page"
          />
        </div>
      </div>
    </fieldset>
    <!-- END: dynamic signature controls -->

    <h2>PdfSigner Component</h2>

    <div v-if="isLoading" class="loading-placeholder">
      <p>Loading PDF...</p>
    </div>

    <PdfSigner
      v-if="pdfData && !isLoading"
      :pdfData="pdfData"
      :signatureData="signatureDataForComponent"
      :enableZoom="true"
      :debug="true"
      :showSignatureBounds="true"
      @finish="handleFinish"
    />

    <div v-if="output" ref="outputSectionRef" class="output-section">
      <h2>Output</h2>
      <div class="output-grid">
        <div class="output-item">
          <h3>Signed Document</h3>
          <p>The signature has been embedded as a vector graphic in the PDF.</p>
          <iframe :src="signedPdfUrl" title="Signed PDF Document"></iframe>
        </div>
        <div class="output-item">
          <h3>Signature Image (PNG)</h3>
          <p>This is the raster image of the signature.</p>
          <img :src="signatureImageUrl" alt="User's signature" />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
header {
  border-bottom: 1px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}
main {
  padding: 1rem;
}

.controls {
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-direction: column;
}
.controls label {
  font-weight: 500;
}
.controls select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  width: 100%;
  max-width: 400px;
}

/* START: Styles for controls */
.signature-controls {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  background-color: #fdfdfd;
}
.signature-controls legend {
  font-weight: 600;
  padding: 0 0.5rem;
}
.signature-controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.input-group label {
  font-size: 0.875rem;
  color: #555;
}
.input-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
/* END: Styles for controls */

.loading-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  background-color: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 8px;
  color: #777;
}

.output-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}
.output-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}
.output-item h3 {
  margin-top: 0;
}
.output-item p {
  color: #555;
  font-size: 0.9rem;
}
.output-item iframe {
  width: 100%;
  height: 600px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.output-item img {
  max-width: 100%;
  height: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}

@media (min-width: 768px) {
  .controls {
    flex-direction: row;
    align-items: center;
  }
  .controls select {
    width: auto;
    min-width: 300px;
  }
  .output-grid {
    grid-template-columns: 2fr 1fr;
  }
}
</style>
