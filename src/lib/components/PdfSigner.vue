<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, watchEffect, toRefs } from 'vue'
import SignaturePadModal from './SignaturePadModal.vue'
import { isDebug } from '../utils/debug'
import type { FinishPayload, SignaturePlacement } from '../types'

import { usePdfRenderer } from '../composables/usePdfRenderer'
import { usePanZoom } from '../composables/usePanZoom'
import { useSignature } from '../composables/useSignature'
import { useSignatureOverlay } from '../composables/useSignatureOverlay'

const props = withDefaults(
  defineProps<{
    pdfData: string
    signatureData?: SignaturePlacement[]
    isDownload?: boolean
    translations?: Record<string, string>
    enableZoom?: boolean
    debug?: boolean
    showSignatureBounds?: boolean
  }>(),
  {
    isDownload: false,
    enableZoom: true,
    signatureData: () => [],
    translations: () => ({}),
    debug: false,
    showSignatureBounds: false,
  },
)

watchEffect(() => {
  isDebug.value = props.debug
})

const emit = defineEmits<{
  (e: 'finish', payload: FinishPayload): void
}>()

// --- START: Template Refs ---
const pdfContainer = ref<HTMLDivElement | null>(null)
const panzoomContainer = ref<HTMLDivElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)
// --- END: Template Refs ---

// --- START: Using Composables ---

// 1. PDF Rendering Logic
const { originalPdfDimensions, firstCanvasRef, isPdfRendered, loadAndRenderPdf } = usePdfRenderer(
  pdfContainer,
  viewportRef,
)

// 2. Pan and Zoom Logic
const { zoomPercentage, initPanzoom, destroyPanzoom, zoomIn, zoomOut } = usePanZoom(
  panzoomContainer,
  viewportRef,
)

// 3. Signature Capture and Saving Logic
const {
  isSignaturePadOpen,
  isSaving,
  signatureSvg,
  t,
  openSignaturePad,
  handleSignatureCancel,
  handleSignatureSave,
  saveDocument,
} = useSignature(props, emit)

// 4. Signature Overlay Positioning Logic
// We use toRefs to pass reactive props to the composable.
const { signatureData, showSignatureBounds } = toRefs(props)
const { signatureStyles } = useSignatureOverlay(
  firstCanvasRef,
  pdfContainer,
  originalPdfDimensions,
  signatureData,
  showSignatureBounds,
)
// --- END: Using Composables ---

// --- START: Lifecycle and Watchers ---

onMounted(() => {
  loadAndRenderPdf(props.pdfData)
})

// When a new PDF is loaded, re-render it.
watch(
  () => props.pdfData,
  (newPdfData, oldPdfData) => {
    if (newPdfData !== oldPdfData) {
      // Destroy the old panzoom instance before loading the new PDF
      destroyPanzoom()
      loadAndRenderPdf(newPdfData)
    }
  },
)

// When the PDF has finished rendering, initialize the panzoom functionality.
watch(isPdfRendered, (isRendered) => {
  if (isRendered) {
    initPanzoom()
  }
})

onBeforeUnmount(() => {
  // The panzoom cleanup is now handled within its own composable.
})
</script>

<template>
  <div class="vue-pdf-signer" @touchstart.stop @touchmove.stop @wheel.stop>
    <div class="pdf-signer-toolbar">
      <div class="toolbar-group">
        <button @click="openSignaturePad" class="btn btn-secondary">{{ t.actionButton }}</button>
        <button @click="saveDocument" class="btn btn-primary" :disabled="!signatureSvg || isSaving">
          {{ t.save }}
        </button>
      </div>
      <div
        v-if="props.enableZoom"
        class="toolbar-group"
        @touchstart.stop
        @touchmove.stop
        @wheel.stop
      >
        <button @click="zoomOut" class="btn btn-icon">-</button>
        <span class="zoom-level">{{ zoomPercentage }}%</span>
        <button @click="zoomIn" class="btn btn-icon">+</button>
      </div>
    </div>

    <div ref="viewportRef" class="pdf-viewport">
      <div ref="panzoomContainer" class="panzoom-container">
        <div ref="pdfContainer" class="pdf-render-view">
          <!-- PDF pages will be rendered here as canvas elements -->
        </div>

        <!-- The signature overlay is now more robust -->
        <div v-if="signatureSvg" class="signature-overlay">
          <!-- We now loop through the calculated styles to render multiple overlays -->
          <div
            v-for="(style, index) in signatureStyles"
            :key="index"
            :style="style"
            class="signature-wrapper"
            v-html="signatureSvg"
          ></div>
        </div>
      </div>
    </div>

    <SignaturePadModal
      v-if="isSignaturePadOpen"
      @close="handleSignatureCancel"
      @save="handleSignatureSave"
    />
  </div>
</template>

<style lang="scss" scoped src="./PdfSigner.scss"></style>
