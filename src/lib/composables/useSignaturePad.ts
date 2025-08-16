import { ref } from 'vue'
import { useScrollLock } from '@vueuse/core'

/**
 * A composable to manage the state of the signature pad modal and the captured signature data.
 */
export function useSignaturePad() {
  // --- START: Reactive State ---
  const isSignaturePadOpen = ref(false)
  const signatureSvg = ref<string | null>(null)
  const signaturePng = ref<string | null>(null)

  const bodyEl = document.querySelector('body')
  const isLocked = useScrollLock(bodyEl)
  // --- END: Reactive State ---

  /** Opens the signature pad modal and locks body scroll. */
  function openSignaturePad() {
    isSignaturePadOpen.value = true
    isLocked.value = true
  }

  /** Closes the signature pad modal and unlocks body scroll. */
  function handleSignatureCancel() {
    isSignaturePadOpen.value = false
    isLocked.value = false
  }

  /**
   * Processes and stores the signature data from the modal, then closes it.
   * @param payload - The signature data containing SVG and PNG strings.
   */
  function handleSignatureSave(payload: { svg: string; png: string }) {
    const { svg, png } = payload
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const el = doc.querySelector('svg')

    if (!el) {
      signatureSvg.value = null
      signaturePng.value = null
      isSignaturePadOpen.value = false
      isLocked.value = false
      return
    }

    const w = parseFloat(el.getAttribute('width') || '')
    const h = parseFloat(el.getAttribute('height') || '')
    if (!el.hasAttribute('viewBox') && Number.isFinite(w) && Number.isFinite(h)) {
      el.setAttribute('viewBox', `0 0 ${w} ${h}`)
    }
    el.removeAttribute('width')
    el.removeAttribute('height')
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    signatureSvg.value = new XMLSerializer().serializeToString(el)
    signaturePng.value = png

    isSignaturePadOpen.value = false
    isLocked.value = false
  }

  return {
    isSignaturePadOpen,
    signatureSvg,
    signaturePng,
    openSignaturePad,
    handleSignatureCancel,
    handleSignatureSave,
  }
}
