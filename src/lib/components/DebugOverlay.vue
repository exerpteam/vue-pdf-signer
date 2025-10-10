<script setup lang="ts">
import { computed } from 'vue'
import { useDebugLogger } from '../composables/useDebugLogger'

const { logs, copyLogs, clearLogs } = useDebugLogger()

const hasLogs = computed(() => logs.value.length > 0)

async function handleCopy() {
  try {
    await copyLogs()
  } catch (error) {
    console.warn('[PdfSigner DEBUG] Failed to copy logs', error)
  }
}
</script>

<template>
  <div class="debug-overlay" data-cy="pdf-debug-overlay">
    <header class="debug-overlay__header">
      <strong>Debug Logs</strong>
      <div class="debug-overlay__actions">
        <button type="button" @click="handleCopy" :disabled="!hasLogs">Copy Logs</button>
        <button type="button" @click="clearLogs" :disabled="!hasLogs">Clear</button>
      </div>
    </header>
    <div class="debug-overlay__body" role="log" aria-live="polite">
      <p v-if="!hasLogs" class="debug-overlay__empty">Logs will appear here.</p>
      <ul v-else>
        <li v-for="(entry, index) in logs" :key="index">{{ entry }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.debug-overlay {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  width: min(22rem, 90vw);
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.85);
  color: #f7fafc;
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.3);
  z-index: 9999;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.debug-overlay__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.debug-overlay__actions {
  display: flex;
  gap: 0.5rem;
}

.debug-overlay__actions button {
  appearance: none;
  border: none;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  background-color: #edf2f7;
  color: #1a202c;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.debug-overlay__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.debug-overlay__body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.375rem;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.debug-overlay__body ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.debug-overlay__empty {
  opacity: 0.7;
  margin: 0;
}
</style>
