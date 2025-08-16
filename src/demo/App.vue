<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { PdfSigner, type FinishPayload } from '../lib'
import { PDF_MANIFEST, type PdfManifestEntry } from './pdf-manifest'

// This interface matches the structure our component's prop expects.
interface SignaturePlacement {
  left: number
  top: number
  width: number
  height: number
  page: number
}

// --- START: Reactive state for our demo app ---
const pdfList = ref<PdfManifestEntry[]>(PDF_MANIFEST)
const selectedPdfFileName = ref<string>(PDF_MANIFEST[0]?.fileName || '')
const pdfData = ref<string>('')
const signatureData = ref<SignaturePlacement[]>([])
const isLoading = ref<boolean>(false)
const output = ref<FinishPayload | null>(null)
const outputSectionRef = ref<HTMLDivElement | null>(null)
// --- END: Reactive state ---

/**
 * Parses the signature box string from the manifest into the format
 * our component expects.
 */
function parseSignatureData(signatureString: string): SignaturePlacement[] {
  const signature: Partial<SignaturePlacement> = { page: 1 } // Default to page 1
  const parts = signatureString.match(/(\w+)=([\d.]+)/g) || []

  parts.forEach((part) => {
    const [key, value] = part.split('=')
    if (key && value) {
      // Use a type assertion here since we are dynamically building the object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(signature as any)[key] = parseFloat(value)
    }
  })

  // We return an array, as the prop expects an array of placements.
  return [signature as SignaturePlacement]
}

/**
 * Dynamically imports a PDF from the samples directory, fetches it,
 * and converts it to a base64 string.
 */
async function loadPdfAsBase64(fileName: string): Promise<string> {
  try {
    // This avoids the MIME type error on iOS/Safari which can be overly strict
    // about importing non-JS assets. The path is relative to the dev server root.
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
        // We need to strip the "data:application/pdf;base64," prefix.
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

// Replace the existing handleFinish function
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
    pdfData.value = '' // Clear previous PDF to show loading state

    const selectedPdf = pdfList.value.find((p) => p.fileName === newFileName)
    if (selectedPdf) {
      // Load the new PDF and parse its signature data in parallel.
      const [loadedPdfData, parsedSignatureData] = await Promise.all([
        loadPdfAsBase64(selectedPdf.fileName),
        Promise.resolve(parseSignatureData(selectedPdf.signatureBoxCm)),
      ])
      pdfData.value = loadedPdfData
      signatureData.value = parsedSignatureData
    }
    isLoading.value = false
  },
  { immediate: true }, // `immediate: true` runs the watcher on component mount to load the initial PDF.
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

    <h2>PdfSigner Component</h2>

    <!-- Display a loading message while the PDF is being fetched. -->
    <div v-if="isLoading" class="loading-placeholder">
      <p>Loading PDF...</p>
    </div>

    <!-- The component is now bound to our dynamic state. -->
    <PdfSigner
      v-if="pdfData && !isLoading"
      :pdfData="pdfData"
      :signatureData="signatureData"
      :enableZoom="true"
      :debug="true"
      :showSignatureBounds="false"
      @finish="handleFinish"
    />

    <!-- START: Output Section -->
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
    <!-- END: Output Section -->
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

/* styles for the controls and loading state. */
.controls {
  margin-bottom: 2rem;
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
  max-width: 400px; /* Optional: prevent it from becoming too wide on tablets */
}
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

@media (min-width: 768px) {
  .controls {
    flex-direction: row;
    align-items: center;
  }
  .controls select {
    width: auto; /* Allow it to size based on content */
    min-width: 300px;
  }
}

/* START: Output Section Styles */
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

@media (min-width: 1024px) {
  .output-grid {
    /* On larger screens, show side-by-side */
    grid-template-columns: 2fr 1fr;
  }
}
/* END: Output Section Styles */
</style>
