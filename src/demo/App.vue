<script setup lang="ts">
// ✍️ We import our component directly from the library's source for immediate feedback.
import { PdfSigner } from '../lib'
</script>

<template>
  <header>
    <h1>Component Library Demo</h1>
    <p>This is a live demonstration of the components being built.</p>
  </header>

  <main>
    <h2>PdfSigner Component</h2>
    <PdfSigner message="This is a test message prop." />
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
