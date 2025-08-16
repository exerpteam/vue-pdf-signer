<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, watchEffect, toRefs, computed } from 'vue'
import SignaturePadModal from './SignaturePadModal.vue'
import { isDebug } from '../utils/debug'
import type { FinishPayload, SignableDocument } from '../types'

import { usePdfRenderer } from '../composables/usePdfRenderer'
import { usePanZoom } from '../composables/usePanZoom'
import { useSignaturePad } from '../composables/useSignaturePad'
import { useSignatureOverlay } from '../composables/useSignatureOverlay'
import { usePdfDocument } from '../composables/usePdfDocument'
import { useTranslations } from '../composables/useTranslations'

const props = withDefaults(
  defineProps<{
    document: SignableDocument
    translations?: Record<string, string>
    debug?: boolean
    showSignatureBounds?: boolean
  }>(),
  {
    translations: () => ({}),
    debug: false,
    showSignatureBounds: false,
  },
)

const pdfData = computed(() => props.document.data)
const signatureData = computed(() => props.document.placements)

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
const { isPdfRendered, loadAndRenderPdf, renderedPages } = usePdfRenderer(pdfContainer, viewportRef)

// 2. Pan and Zoom Logic
const { zoomPercentage, initPanzoom, destroyPanzoom, zoomIn, zoomOut } = usePanZoom(
  panzoomContainer,
  viewportRef,
)

// 3. Signature Pad (Modal and Data Capture)
const {
  isSignaturePadOpen,
  signatureSvg,
  signaturePng,
  openSignaturePad,
  handleSignatureCancel,
  handleSignatureSave,
} = useSignaturePad()

// 4. PDF Document Generation (Saving Logic)
// We pass our computed refs to the composable.
const { isSaving, saveDocument } = usePdfDocument(
  pdfData,
  signatureData,
  emit,
  signatureSvg,
  signaturePng,
)

// 5. UI Text and Translations
const { t } = useTranslations(props, isSaving, signatureSvg)

// 6. Signature Overlay Positioning Logic
// We pass the computed ref here as well.
const { showSignatureBounds } = toRefs(props)
const { signatureStyles } = useSignatureOverlay(
  renderedPages,
  pdfContainer,
  signatureData,
  showSignatureBounds,
)
// --- END: Using Composables ---

// --- START: Lifecycle and Watchers ---

onMounted(() => {
  loadAndRenderPdf(pdfData.value)
})

// When a new PDF is loaded, re-render it.
watch(pdfData, (newPdfData, oldPdfData) => {
  if (newPdfData !== oldPdfData) {
    // Destroy the old panzoom instance before loading the new PDF
    destroyPanzoom()
    loadAndRenderPdf(newPdfData)
  }
})

// When the PDF has finished rendering, initialize the panzoom functionality.
watch(isPdfRendered, (isRendered) => {
  if (isRendered) {
    initPanzoom()
  }
})

onBeforeUnmount(() => {
  // The panzoom cleanup is handled within its own composable.
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
      <div class="toolbar-group" @touchstart.stop @touchmove.stop @wheel.stop>
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

        <!-- The signature overlay -->
        <div v-if="signatureSvg" class="signature-overlay">
          <!-- We loop through the calculated styles to render multiple overlays -->
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
      :title="t.modalTitle"
      :subtitle="t.modalSubtitle"
      :cancel-text="t.modalCancel"
      :clear-text="t.modalClear"
      :done-text="t.modalDone"
    />
  </div>
</template>

<style lang="scss" scoped src="./PdfSigner.scss"></style>
