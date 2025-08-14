<script setup lang="ts">
import { ref } from 'vue'
import { PdfSigner } from '../lib'
import { SAMPLE_PDF_DATA } from './sample-pdf'

// This is a simple, one-page, blank PDF encoded in base64.
// We'll use it to test our rendering logic.
const samplePdfData = ref(SAMPLE_PDF_DATA)
</script>

<template>
  <header>
    <h1>Component Library Demo</h1>
    <p>This is a live demonstration of the components being built.</p>
  </header>

  <main>
    <h2>PdfSigner Component</h2>
    <!-- Pass the sample PDF data to our component. -->
    <PdfSigner :pdfData="samplePdfData" :enableZoom="true" v-if="samplePdfData" />
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
</style>
