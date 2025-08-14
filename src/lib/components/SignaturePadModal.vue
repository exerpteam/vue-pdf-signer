<script setup lang="ts">
defineEmits<{
  (e: 'close'): void
  (e: 'save', svg: string): void
}>()

// This is a hardcoded sample of what a signature's SVG path data might look like.
// We'll replace this with real data from a canvas library later.
const sampleSignatureSvg = 'M10 80 C 40 20, 60 20, 90 80 S 150 140, 180 80'
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <h3>Signature Pad</h3>
      <div class="signature-canvas-placeholder">
        <p>Signature drawing area will be here.</p>
      </div>
      <div class="modal-actions">
        <button @click="$emit('close')" class="btn btn-secondary">Cancel</button>
        <button @click="$emit('save', sampleSignatureSvg)" class="btn btn-primary">
          Save Signature
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
}

.signature-canvas-placeholder {
  border: 2px dashed #ccc;
  border-radius: 4px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  color: #777;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

/* Re-using button styles from the main component for consistency */
.btn {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #fff;
  color: #333;
}
.btn-primary {
  background-color: #007aff;
  color: white;
  border-color: #007aff;
}
.btn-secondary {
  background-color: #6c757d;
  color: white;
  border-color: #6c757d;
}
.btn:disabled {
  background-color: #aeb1b4;
  border-color: #aeb1b4;
  color: #e9ecef;
  cursor: not-allowed;
}
</style>
