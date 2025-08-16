import { computed, type Ref } from 'vue'

/**
 * A composable to manage all user-facing text within the component,
 * handling translations and dynamic button labels.
 *
 * @param props - The component's props, specifically the `translations` object.
 * @param isSaving - A ref indicating if the save process is active.
 * @param signatureSvg - A ref holding the current signature SVG data.
 */
export function useTranslations(
  props: { translations?: Record<string, string> },
  isSaving: Ref<boolean>,
  signatureSvg: Ref<string | null>,
) {
  const t = computed(() => {
    // This object contains all default English strings for the component.
    const defaultTranslations = {
      // Toolbar buttons
      updateSignature: 'Change Signature',
      drawSignature: 'Sign Here',
      save: 'Save',
      saving: 'Saving...',
      // SignaturePadModal content
      modalTitle: 'Draw Signature',
      modalSubtitle: 'Use your mouse or finger to draw your signature below.',
      modalCancel: 'Cancel',
      modalClear: 'Clear',
      modalDone: 'Done',
    }

    // We merge the user's translations over our defaults.
    const merged = { ...defaultTranslations, ...props.translations }

    const hasSignature = !!signatureSvg.value

    // The logic uses the merged object and returns all strings.
    if (isSaving.value) {
      return {
        ...merged,
        actionButton: merged.updateSignature,
        save: merged.saving,
      }
    }
    return {
      ...merged,
      actionButton: hasSignature ? merged.updateSignature : merged.drawSignature,
      save: merged.save,
    }
  })

  return { t }
}
