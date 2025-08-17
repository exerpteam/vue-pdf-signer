<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { PdfSigner, type FinishPayload, type PdfDocument } from '../lib'
import { PDF_MANIFEST } from './pdf-manifest'

// --- START: Reactive state for our demo app ---
const documents = ref<PdfDocument[]>([])
const isLoading = ref<boolean>(true)
const signingPolicy = ref<'all' | 'any'>('all')
const output = ref<FinishPayload | null>(null)
const outputSectionRef = ref<HTMLDivElement | null>(null)

const customTranslations = ref({
  save: 'Finish & Save All',
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
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
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

// Helper to get the original name for a signed document from the output.
function getDocName(key: string): string {
  return documents.value.find((doc) => doc.key === key)?.name ?? key
}

// On component mount, we load all the PDFs defined in our manifest.
onMounted(async () => {
  const loadedDocs = await Promise.all(
    PDF_MANIFEST.map(async (manifestEntry) => {
      const pdfData = await loadPdfAsBase64(manifestEntry.fileName)
      return {
        key: manifestEntry.key,
        name: manifestEntry.name,
        data: pdfData,
        placements: manifestEntry.signaturePlacement,
        signed: manifestEntry.signed,
      }
    }),
  )
  documents.value = loadedDocs.filter((doc) => doc.data) // Filter out any that failed to load
  isLoading.value = false
})
</script>

<template>
  <header>
    <h1>Component Library Demo</h1>
    <p>This is a live demonstration of the multi-document signing component.</p>
  </header>

  <main>
    <!-- START: Signing Policy Controls -->
    <fieldset class="controls">
      <legend>Signing Policy</legend>
      <div class="radio-group">
        <input type="radio" id="policy-all" value="all" v-model="signingPolicy" />
        <label for="policy-all">Require All documents to be signed</label>
      </div>
      <div class="radio-group">
        <input type="radio" id="policy-any" value="any" v-model="signingPolicy" />
        <label for="policy-any">Allow saving after Any document is signed</label>
      </div>
    </fieldset>
    <!-- END: Signing Policy Controls -->

    <h2>PdfSigner Component</h2>

    <div v-if="isLoading" class="loading-placeholder">
      <p>Loading PDF documents...</p>
    </div>

    <PdfSigner
      v-if="!isLoading && documents.length > 0"
      :documents="documents"
      :signing-policy="signingPolicy"
      :debug="true"
      :showSignatureBounds="true"
      :translations="customTranslations"
      @finish="handleFinish"
    />

    <div v-if="output" ref="outputSectionRef" class="output-section">
      <h2>Output</h2>
      <p>The following documents were signed and processed.</p>
      <div class="output-container">
        <div v-for="(result, key) in output" :key="key" class="output-card">
          <h3>{{ getDocName(key) }}</h3>
          <div class="output-grid">
            <div class="output-item">
              <h4>Signed Document (PDF)</h4>
              <iframe :src="`data:application/pdf;base64,${result.signedDocument.data}`"></iframe>
            </div>
            <div class="output-item">
              <h4>Signature Image (PNG)</h4>
              <img :src="`data:image/png;base64,${result.signatureImage.data}`" alt="Signature" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped src="./App.scss"></style>
