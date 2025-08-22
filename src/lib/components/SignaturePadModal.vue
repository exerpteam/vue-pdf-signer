<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import SignaturePad, { type BasicPoint } from 'signature_pad'

// we define props for all user-facing text in this component.
const props = defineProps<{
  title: string
  subtitle: string
  cancelText: string
  clearText: string
  doneText: string
}>()

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
    // backgroundColor:
    //  '#ffffff',
  })

  window.addEventListener('draw-signature-for-test', (event: any) => {
    const data = event.detail
    if (!signaturePadInstance.value || !data) return
    signaturePadInstance.value.clear()
    signaturePadInstance.value.fromData(data)
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
        <h3>{{ props.title }}</h3>
        <p>{{ props.subtitle }}</p>
      </div>

      <div class="signature-pad-wrapper">
        <canvas ref="canvasRef" class="signature-canvas" data-cy="signature-pad-canvas"
        ></canvas>
      </div>

      <div class="modal-actions" data-cy="signature-pad-actions">
        <button @click="$emit('close')" class="btn btn-secondary" data-cy="signature-pad-cancel-button">{{ props.cancelText }}</button>
        <button @click="handleClear" class="btn btn-tertiary" data-cy="signature-pad-clear-button">{{ props.clearText }}</button>
        <button @click="handleSave" class="btn btn-primary" data-cy="sign-done">{{ props.doneText }}</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped src="./SignaturePadModal.scss"></style>
