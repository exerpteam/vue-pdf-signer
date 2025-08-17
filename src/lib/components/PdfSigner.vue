<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, watchEffect, toRefs, computed, toRef } from 'vue'
import SignaturePadModal from './SignaturePadModal.vue'
import { isDebug } from '../utils/debug'
import type { FinishPayload, PdfDocument } from '../types'

import { usePdfRenderer } from '../composables/usePdfRenderer'
import { usePanZoom } from '../composables/usePanZoom'
import { useSignaturePad } from '../composables/useSignaturePad'
import { useSignatureOverlay } from '../composables/useSignatureOverlay'
import { usePdfDocument } from '../composables/usePdfDocument'
import { useTranslations } from '../composables/useTranslations'

const props = withDefaults(
  defineProps<{
    documents: PdfDocument[]
    signingPolicy?: 'all' | 'any'
    translations?: Record<string, string>
    debug?: boolean
    showSignatureBounds?: boolean
  }>(),
  {
    signingPolicy: 'all',
    translations: () => ({}),
    debug: false,
    showSignatureBounds: false,
  },
)

watchEffect(() => {
  isDebug.value = props.debug
})

// --- START: Multi-document state management ---
const activeDocumentKey = ref<string | null>(null)
const newlySignedKeys = ref<Set<string>>(new Set())

const isFinishEnabled = computed(() => {
  // If no signature has been drawn yet, disable the button.
  if (!signatureSvg.value) return false

  const unsignedDocs = props.documents.filter((doc) => !doc.signed)

  if (props.signingPolicy === 'all') {
    // Every document that wasn't pre-signed must be newly signed.
    return unsignedDocs.every((doc) => newlySignedKeys.value.has(doc.key))
  }

  if (props.signingPolicy === 'any') {
    // At least one document must be newly signed.
    return newlySignedKeys.value.size > 0
  }

  return false
})

// This computed property finds the currently selected document object.
const activeDocument = computed(() => {
  if (!activeDocumentKey.value) return null
  return props.documents.find((doc) => doc.key === activeDocumentKey.value) ?? null
})

// These computed properties feed the active document's data to our composables.
// This adapts our existing logic to the new multi-document structure.
const pdfData = computed(() => activeDocument.value?.data ?? '')
const signatureData = computed(() => activeDocument.value?.placements ?? [])

// When the documents prop changes, we select the first non-pre-signed document as the active one.
watch(
  () => props.documents,
  (docs) => {
    // When the list of documents changes, clear any session signatures.
    newlySignedKeys.value.clear()
    const firstUnsignedDoc = docs.find((doc) => !doc.signed)
    activeDocumentKey.value = firstUnsignedDoc?.key ?? docs[0]?.key ?? null
  },
  { immediate: true },
)
// --- END: Multi-document state management ---

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
  handleSignatureSave: _handleSignatureSave, // Renamed original handler
} = useSignaturePad()

// When we save a signature from the modal, we also record that the active document is now signed.
function handleSignatureSave(payload: { svg: string; png: string }) {
  _handleSignatureSave(payload)
  if (activeDocumentKey.value) {
    newlySignedKeys.value.add(activeDocumentKey.value)
  }
}

// 4. PDF Document Generation (Saving Logic)
const { isSaving, saveDocument } = usePdfDocument(
  toRef(props, 'documents'),
  newlySignedKeys,
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

watch(activeDocumentKey, () => {
  signatureSvg.value = null
  signaturePng.value = null
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
        <button
          @click="saveDocument"
          class="btn btn-primary"
          :disabled="!isFinishEnabled || isSaving"
        >
          {{ t.save }}
        </button>
      </div>
      <div class="toolbar-group" @touchstart.stop @touchmove.stop @wheel.stop>
        <button @click="zoomOut" class="btn btn-icon">-</button>
        <span class="zoom-level">{{ zoomPercentage }}%</span>
        <button @click="zoomIn" class="btn btn-icon">+</button>
      </div>
    </div>

    <div class="pdf-signer-main">
      <div class="document-list-container">
        <button
          v-for="doc in documents"
          :key="doc.key"
          @click="activeDocumentKey = doc.key"
          class="document-list-item"
          :class="{ active: activeDocumentKey === doc.key }"
        >
          <span v-if="doc.signed || newlySignedKeys.has(doc.key)" class="status-icon">✔</span>
          <span>{{ doc.name || doc.key }}</span>
        </button>
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
