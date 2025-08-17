import { computed, type Ref } from 'vue'
import type { PdfDocument } from '../types'

/**
 * A composable to manage all user-facing text within the component,
 * handling translations and dynamic button labels.
 *
 * @param props - The component's props, specifically the `translations` object.
 * @param isSaving - A ref indicating if the save process is active.
 * @param signatureSvg - A ref holding the current signature SVG data for the active document.
 * @param activeDocument - A ref to the currently active document object.
 */
export function useTranslations(
  props: { translations?: Record<string, string> },
  isSaving: Ref<boolean>,
  signatureSvg: Ref<string | null>,
  activeDocument: Ref<PdfDocument | null>,
) {
  const t = computed(() => {
    const defaultTranslations = {
      // Toolbar buttons
      updateSignature: 'Change Signature',
      drawSignature: 'Sign Document',
      save: 'Save',
      saving: 'Saving...',
      // keys for the cancel flow.
      cancel: 'Cancel',
      cancelWarning: 'You have unsigned changes. Are you sure you want to discard them and cancel?',
      // SignaturePadModal content
      modalTitle: 'Draw Signature',
      modalSubtitle: 'Use your mouse or finger to draw your signature below.',
      modalCancel: 'Cancel',
      modalClear: 'Clear',
      modalDone: 'Done',
    }

    const merged = { ...defaultTranslations, ...props.translations }

    const hasSessionSignature = !!signatureSvg.value
    const isPreSigned = !!activeDocument.value?.signed

    // If the document is pre-signed OR has a new signature,
    // the action is to change it. Otherwise, it's to draw a new one.
    const actionButtonText =
      isPreSigned || hasSessionSignature ? merged.updateSignature : merged.drawSignature

    // The sign button should only be disabled while the save process is running.
    const isSignActionDisabled = isSaving.value

    if (isSaving.value) {
      return {
        ...merged,
        actionButton: actionButtonText,
        save: merged.saving,
        isSignActionDisabled,
      }
    }
    return {
      ...merged,
      actionButton: actionButtonText,
      save: merged.save,
      isSignActionDisabled,
    }
  })

  return { t }
}
