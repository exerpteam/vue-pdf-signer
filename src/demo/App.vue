<script setup lang="ts">
import { ref } from 'vue'
import { PdfSigner } from '../lib'

// This is a simple, one-page, blank PDF encoded in base64.
// We'll use it to test our rendering logic.
const samplePdfData = ref(
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUiA0IDAgUl0gL0NvdW50IDIgPj4KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago2IDAgb2JqCjw8IC9MZW5ndGggNzkgPj4Kc3RyZWFtCkJUIC9GMSAyNCBUZiA3MiA3MjAgVGQgKFNhbXBsZSB0d28tcGFnZSBQREYgLSBwYWdlIDEpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PCAvTGVuZ3RoIDc5ID4+CnN0cmVhbQpCVCAvRjEgMjQgVGYgNzIgNzIwIFRkIChTYW1wbGUgdHdvLXBhZ2UgUERGIFstIHBhZ2UgMl0pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKMyAwIG9iago8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDUgMCBSID4+ID4+IC9Db250ZW50cyA2IDAgUiA+PgplbmRvYmoKNCAwIG9iago8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDUgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PgplbmRvYmoKeHJlZgowIDgKMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwNDYgMDAwMDAgbiAKMDAwMDAwMTQgMDAwMDAgbiAKMDAwMDAwMjkgMDAwMDAgbiAKMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwODkgMDAwMDAgbiAKMDAwMDAxOTQgMDAwMDAgbiAKMDAwMDAzMTQgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo2Njc3CiUlRU9GCg==',
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
