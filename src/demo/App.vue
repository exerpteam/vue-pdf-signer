<script setup lang="ts">
import { ref } from 'vue'
import { PdfSigner } from '../lib'

// This is a simple, one-page, blank PDF encoded in base64.
// We'll use it to test our rendering logic.
const samplePdfData = ref(
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94IDAgMCA2MTIgNzkyPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHMgWzEgMCBSXT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDAwMTggMDAwMDAgbg0KMDAwMDAwMDA4MyAwMDAwMCBuDQowMDAwMDAwMTQxIDAwMDAwIG4NCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMyAwIFI+PgpzdGFydHhyZWYKMTg0CiUlRU9G',
)
</script>

<template>
  <header>
    <h1>Component Library Demo</h1>
    <p>This is a live demonstration of the components being built.</p>
  </header>

  <main>
    <h2>PdfSigner Component</h2>
    <!-- Pass the sample PDF data to our component. -->
    <PdfSigner :pdfData="samplePdfData" v-if="samplePdfData" />
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
