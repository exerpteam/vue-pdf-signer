<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import SignaturePad from 'signature_pad'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { svg: string; png: string }): void
}>()

// Refs for the canvas element and the SignaturePad instance.
const canvasRef = ref<HTMLCanvasElement | null>(null)
const signaturePadInstance = ref<SignaturePad | null>(null)

// --- START: Event Handlers ---

function handleSave() {
  if (signaturePadInstance.value?.isEmpty()) {
    emit('close')
    return
  }

  // we capture both SVG for vector embedding and PNG for the event payload.
  const signatureSVG = signaturePadInstance.value?.toSVG()
  const signaturePNG = signaturePadInstance.value?.toDataURL('image/png') // Defaults to PNG

  if (signatureSVG && signaturePNG) {
    emit('save', { svg: signatureSVG, png: signaturePNG })
  }
}

function handleClear() {
  signaturePadInstance.value?.clear()
}

// --- END: Event Handlers ---

// --- START: Canvas Resize Logic ---

/**
 * This function ensures the canvas drawing buffer is the same size as its
 * display size, preventing distortion. It's crucial for responsiveness.
 */
function resizeCanvas() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ratio = Math.max(window.devicePixelRatio || 1, 1)

  // We set the physical pixel dimensions of the canvas.
  canvas.width = canvas.offsetWidth * ratio
  canvas.height = canvas.offsetHeight * ratio
  canvas.getContext('2d')?.scale(ratio, ratio)

  // After resizing, we need to clear the pad to apply the new dimensions.
  // The content is lost on resize, so this is expected behavior.
  signaturePadInstance.value?.clear()
}

// --- END: Canvas Resize Logic ---

// --- START: Lifecycle Hooks ---

onMounted(() => {
  if (!canvasRef.value) return

  // Initialize the SignaturePad instance on our canvas element.
  signaturePadInstance.value = new SignaturePad(canvasRef.value, {
    penColor: '#000080', // A dark navy blue, as requested for the final PDF.
    backgroundColor: '#ffffff',
  })

  // Set up the resize listener to handle orientation changes or window resizing.
  window.addEventListener('resize', resizeCanvas)
  resizeCanvas() // Initial resize to set the correct dimensions on mount.
})

onUnmounted(() => {
  // Clean up the listener to prevent memory leaks.
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Draw Signature</h3>
        <p>Use your mouse or finger to draw your signature below.</p>
      </div>

      <div class="signature-pad-wrapper">
        <canvas ref="canvasRef" class="signature-canvas"></canvas>
      </div>

      <div class="modal-actions">
        <button @click="$emit('close')" class="btn btn-secondary">Cancel</button>
        <button @click="handleClear" class="btn btn-tertiary">Clear</button>
        <button @click="handleSave" class="btn btn-primary">Done</button>
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
  display: flex;
  flex-direction: column;
}

.modal-header {
  margin-bottom: 1rem;
  text-align: center;
}
.modal-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}
.modal-header p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.signature-pad-wrapper {
  /* The border is dashed for a cleaner look. */
  border: 2px dashed #ccc;
  border-radius: 4px;
  margin-bottom: 1rem;
  touch-action: none; /* Prevents scrolling on touch devices while drawing */
  position: relative;
  height: 200px; /* Default height, will be adjusted by flex */
  flex-grow: 1;
}
.signature-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary {
  background-color: #007aff;
  color: white;
}
.btn-primary:hover {
  background-color: #005ecb;
}
.btn-secondary {
  background-color: #6c757d;
  color: white;
}
.btn-secondary:hover {
  background-color: #5a6268;
}
.btn-tertiary {
  background-color: #f0f0f0;
  color: #333;
  border-color: #ccc;
}
.btn-tertiary:hover {
  background-color: #e0e0e0;
}
</style>
