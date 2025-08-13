<script setup lang="ts">
// ✍️ Define the props our component will accept.
// We'll expand this later to match the specification.
defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="vue-pdf-signer-container">
    <h1>Vue PDF Signer Component</h1>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<style scoped>
/* ✍️ Scoped styles ensure our component's CSS doesn't leak out. */
.vue-pdf-signer-container {
  border: 1px solid #42b983;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f0fdf4;
  color: #14532d;
}
</style>
