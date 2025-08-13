<script setup lang="ts">
// We are defining the full public API for our component to match the
// old component's interface. This makes it a true drop-in replacement.
// The props are currently unused in the template but are part of the component's contract.

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

defineProps<{
  pdfData: string
  signatureData: SignaturePlacement[]
  isDownload?: boolean
  translations?: Record<string, string>
  enableZoom?: boolean
}>()

const emit = defineEmits<{
  (e: 'finish', payload: FinishPayload): void
}>()

// A dummy function to show how an event would be emitted.
function handleSave() {
  console.log('Save button clicked. Emitting a dummy finish event.')
  // In the future, this will contain the real signed PDF and signature data.
  emit('finish', {
    signedDocument: { type: 'application/pdf', data: 'dummy-pdf-base64' },
    signatureImage: { type: 'image/png', data: 'dummy-signature-base64' },
  })
}
</script>

<template>
  <div class="vue-pdf-signer-container">
    <h2>Vue PDF Signer (Placeholder)</h2>
    <p>The PDF viewer and signature functionality will be implemented here.</p>
    <p>Props like `pdfData` and `signatureData` have been received.</p>
    <button @click="handleSave">Simulate Save & Finish</button>
  </div>
</template>

<style scoped>
.vue-pdf-signer-container {
  border: 1px solid #42b983;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f0fdf4;
  color: #14532d;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
button {
  margin-top: 1rem;
  padding: 8px 16px;
  border: 1px solid #34d399;
  background-color: #a7f3d0;
  border-radius: 4px;
  cursor: pointer;
}
</style>
