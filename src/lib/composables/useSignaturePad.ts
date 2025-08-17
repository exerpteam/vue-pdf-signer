import { ref } from 'vue'
import { useScrollLock } from '@vueuse/core'

/**
 *
 * Processes a raw SVG string from signature_pad to make it scalable and embeddable.
 * - Adds a viewBox if missing.
 * - Removes fixed width/height attributes.
 * - Sets preserveAspectRatio.
 * @param svg The raw SVG string.
 * @returns A processed SVG string, or null if the input is invalid.
 */
export function processSignatureSVG(svg: string): string | null {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const el = doc.querySelector('svg')

  if (!el) {
    return null
  }

  const w = parseFloat(el.getAttribute('width') || '')
  const h = parseFloat(el.getAttribute('height') || '')
  if (!el.hasAttribute('viewBox') && Number.isFinite(w) && Number.isFinite(h)) {
    el.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }
  el.removeAttribute('width')
  el.removeAttribute('height')
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet')

  return new XMLSerializer().serializeToString(el)
}

/**
 * A composable to manage the state of the signature pad modal.
 */
export function useSignaturePad() {
  const isSignaturePadOpen = ref(false)

  const bodyEl = document.querySelector('body')
  const isLocked = useScrollLock(bodyEl)

  /** Opens the signature pad modal and locks body scroll. */
  function openSignaturePad() {
    isSignaturePadOpen.value = true
    isLocked.value = true
  }

  /** Closes the signature pad modal and unlocks body scroll. */
  function closeSignaturePad() {
    isSignaturePadOpen.value = false
    isLocked.value = false
  }

  return {
    isSignaturePadOpen,
    openSignaturePad,
    closeSignaturePad,
  }
}
