<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import SignaturePad, { type PointGroup } from 'signature_pad'
import { useDebugLogger } from '../composables/useDebugLogger'
import { isDebug } from '../utils/debug'

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
const { log } = useDebugLogger()
const pointerEventTypes = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const
let removePointerListeners: (() => void) | null = null
const drawSignatureEvent = 'draw-signature-for-test'

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

function handleExternalSignature(event: Event) {
  const signaturePad = signaturePadInstance.value
  if (!signaturePad) {
    return
  }

  const { detail } = event as CustomEvent<PointGroup[]>
  if (!detail) {
    return
  }

  signaturePad.clear()
  signaturePad.fromData(detail)
}

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

  window.addEventListener(drawSignatureEvent, handleExternalSignature as EventListener)

  // Set up the resize listener to handle orientation changes or window resizing.
  window.addEventListener('resize', resizeCanvas)
  resizeCanvas() // Initial resize to set the correct dimensions on mount.

  if (isDebug.value) {
    addPointerLogging()
  }
})

onUnmounted(() => {
  teardownPointerLogging()
  // Clean up the listener to prevent memory leaks.
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener(drawSignatureEvent, handleExternalSignature as EventListener)
})

function handlePointerEvent(event: PointerEvent) {
  if (!isDebug.value) return

  log('SignaturePad pointer event', {
    type: event.type,
    pointerType: event.pointerType,
    pointerId: event.pointerId,
    pressure: event.pressure,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

function addPointerLogging() {
  if (!canvasRef.value || removePointerListeners) {
    return
  }

  const canvas = canvasRef.value

  pointerEventTypes.forEach((eventName) => {
    canvas.addEventListener(eventName, handlePointerEvent)
  })

  removePointerListeners = () => {
    pointerEventTypes.forEach((eventName) => {
      canvas.removeEventListener(eventName, handlePointerEvent)
    })
    removePointerListeners = null
  }
}

function teardownPointerLogging() {
  removePointerListeners?.()
}

watch(
  () => isDebug.value,
  (enabled) => {
    if (enabled) {
      addPointerLogging()
    } else {
      teardownPointerLogging()
    }
  },
  { flush: 'post' },
)

</script>

<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ props.title }}</h3>
        <p>{{ props.subtitle }}</p>
      </div>

      <div class="signature-pad-wrapper panzoom-exclude">
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
