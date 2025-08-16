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

// array to manage multiple signature placements.
const dynamicSignatureData = ref<SignaturePlacement[]>([])

const customTranslations = ref({
  drawSignature: 'Sign Here (Custom)',
  save: 'Save Document',
  modalTitle: 'Please Draw Your Signature',
  modalDone: 'Confirm',
  modalClear: 'Erase',
  modalCancel: 'Go Back',
})

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
      // When a new PDF is selected, we do a deep copy of its placement array.
      // This prevents mutations from affecting our original manifest data.
      dynamicSignatureData.value = JSON.parse(JSON.stringify(selectedPdf.signaturePlacement))
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
      <legend>Signature Placements</legend>
      <!-- We loop through each placement in the array -->
      <div
        v-for="(placement, index) in dynamicSignatureData"
        :key="index"
        class="signature-placement-item"
      >
        <div class="item-header">
          <h4>Signature #{{ index + 1 }}</h4>
          <button @click="dynamicSignatureData.splice(index, 1)" class="remove-btn">Remove</button>
        </div>
        <div class="signature-controls-grid">
          <div class="input-group">
            <label :for="`sig-left-${index}`">Left (cm)</label>
            <input
              :id="`sig-left-${index}`"
              type="number"
              step="0.1"
              v-model.number="placement.left"
            />
          </div>
          <div class="input-group">
            <label :for="`sig-top-${index}`">Top (cm)</label>
            <input
              :id="`sig-top-${index}`"
              type="number"
              step="0.1"
              v-model.number="placement.top"
            />
          </div>
          <div class="input-group">
            <label :for="`sig-width-${index}`">Width (cm)</label>
            <input
              :id="`sig-width-${index}`"
              type="number"
              step="0.1"
              v-model.number="placement.width"
            />
          </div>
          <div class="input-group">
            <label :for="`sig-height-${index}`">Height (cm)</label>
            <input
              :id="`sig-height-${index}`"
              type="number"
              step="0.1"
              v-model.number="placement.height"
            />
          </div>
          <div class="input-group">
            <label :for="`sig-page-${index}`">Page</label>
            <input
              :id="`sig-page-${index}`"
              type="number"
              step="1"
              min="1"
              v-model.number="placement.page"
            />
          </div>
        </div>
      </div>
      <button
        @click="dynamicSignatureData.push({ left: 2, top: 2, width: 8, height: 4, page: 1 })"
        class="add-btn"
      >
        + Add Signature Placement
      </button>
    </fieldset>
    <!-- END: dynamic signature controls -->

    <h2>PdfSigner Component</h2>

    <div v-if="isLoading" class="loading-placeholder">
      <p>Loading PDF...</p>
    </div>

    <PdfSigner
      v-if="pdfData && !isLoading"
      :pdfData="pdfData"
      :signatureData="dynamicSignatureData"
      :enableZoom="true"
      :debug="true"
      :showSignatureBounds="true"
      :translations="customTranslations"
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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.signature-controls legend {
  font-weight: 600;
  padding: 0 0.5rem;
}

.signature-placement-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 1rem;
  background-color: #fff;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}
.item-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.remove-btn {
  background: none;
  border: 1px solid #dc3545;
  color: #dc3545;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}
.remove-btn:hover {
  background-color: #dc3545;
  color: white;
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

.add-btn {
  align-self: flex-start;
  background-color: #007aff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}
.add-btn:hover {
  background-color: #005ecb;
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
