<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, watchEffect, toRefs, computed, toRef } from 'vue'
import SignaturePadModal from './SignaturePadModal.vue'
import { isDebug } from '../utils/debug'
import type { FinishPayload, PdfDocument } from '../types'

import { usePdfRenderer } from '../composables/usePdfRenderer'
import { usePanZoom } from '../composables/usePanZoom'
import { useSignaturePad, processSignatureSVG } from '../composables/useSignaturePad'
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

// maps a document key to its specific signature data.
const signatureDataMap = ref<Map<string, { svg: string; png: string }>>(new Map())

const isFinishEnabled = computed(() => {
  if (props.signingPolicy === 'any') {
    return true
  }

  if (props.signingPolicy === 'all') {
    const requiredDocs = props.documents.filter((doc) => !doc.signed)
    if (requiredDocs.length === 0) {
      return true
    }
    const allRequiredDocsAreSigned = requiredDocs.every((doc) => newlySignedKeys.value.has(doc.key))

    // The existence of a signature is implied by a key being in `newlySignedKeys`.
    return allRequiredDocsAreSigned
  }

  return false
})

const activeDocument = computed(() => {
  if (!activeDocumentKey.value) return null
  return props.documents.find((doc) => doc.key === activeDocumentKey.value) ?? null
})

const pdfData = computed(() => activeDocument.value?.data ?? '')
const signatureData = computed(() => activeDocument.value?.placements ?? [])

// This computed ref gets the signature for the *currently active* document.
const activeSignature = computed(() => {
  if (!activeDocumentKey.value) return null
  return signatureDataMap.value.get(activeDocumentKey.value) ?? null
})

// We can now derive the SVG and PNG for the active signature.
const activeSignatureSvg = computed(() => activeSignature.value?.svg ?? null)
// const activeSignaturePng = computed(() => activeSignature.value?.png ?? null)

watch(
  () => props.documents,
  (docs) => {
    newlySignedKeys.value.clear()
    // clear the signature map when documents change.
    signatureDataMap.value.clear()
    const firstUnsignedDoc = docs.find((doc) => !doc.signed)
    activeDocumentKey.value = firstUnsignedDoc?.key ?? docs[0]?.key ?? null
  },
  { immediate: true },
)
// --- END: Multi-document state management ---

const emit = defineEmits<{
  finish: [payload: FinishPayload]
  cancel: [] // No payload for the cancel event
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
const { isSignaturePadOpen, openSignaturePad, closeSignaturePad } = useSignaturePad()

// This is the save handler. It's called directly by the modal's @save event.
function handleSignatureSave(payload: { svg: string; png: string }) {
  const processedSvg = processSignatureSVG(payload.svg)

  // We only proceed if the SVG is valid and we have an active document.
  if (processedSvg && activeDocumentKey.value) {
    signatureDataMap.value.set(activeDocumentKey.value, {
      svg: processedSvg,
      png: payload.png,
    })
    newlySignedKeys.value.add(activeDocumentKey.value)
  }

  // We always close the modal after an attempt.
  closeSignaturePad()
}

// 4. PDF Document Generation (Saving Logic)
// For now, we pass the active signature. This will be refactored in a later step
// when we update usePdfDocument to handle the whole map.
const { isSaving, saveDocument } = usePdfDocument(
  toRef(props, 'documents'),
  newlySignedKeys,
  emit,
  signatureDataMap,
)

// 5. UI Text and Translations
const { t } = useTranslations(props, isSaving, activeSignatureSvg, activeDocument)

// 6. Signature Overlay Positioning Logic
const { showSignatureBounds } = toRefs(props)
const { signatureStyles } = useSignatureOverlay(
  renderedPages,
  pdfContainer,
  signatureData,
  showSignatureBounds,
)
// --- END: Using Composables ---

// --- START: Lifecycle and Watchers ---

function handleCancel() {
  // Check if there are any new signatures.
  if (newlySignedKeys.value.size > 0) {
    // If so, ask the user for confirmation using the text from our composable.
    if (window.confirm(t.value.cancelWarning)) {
      emit('cancel')
    }
    // If the user clicks "Cancel" in the confirm dialog, we do nothing.
  } else {
    // If there are no new signatures, just emit the event directly.
    emit('cancel')
  }
}

onMounted(() => {
  loadAndRenderPdf(pdfData.value)
})

watch(pdfData, (newPdfData, oldPdfData) => {
  if (newPdfData !== oldPdfData) {
    destroyPanzoom()
    loadAndRenderPdf(newPdfData)
  }
})

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
        <button
          @click="openSignaturePad"
          class="btn btn-secondary"
          :disabled="t.isSignActionDisabled"
        >
          {{ t.actionButton }}
        </button>
        <button
          @click="saveDocument"
          class="btn btn-primary"
          :disabled="!isFinishEnabled || isSaving"
        >
          {{ t.save }}
        </button>
        <button @click="handleCancel" class="btn">{{ t.cancel }}</button>
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
          <div v-if="activeSignatureSvg" class="signature-overlay">
            <!-- We loop through the calculated styles to render multiple overlays -->
            <div
              v-for="(style, index) in signatureStyles"
              :key="index"
              :style="style"
              class="signature-wrapper"
              v-html="activeSignatureSvg"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <SignaturePadModal
      v-if="isSignaturePadOpen"
      @close="closeSignaturePad"
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
