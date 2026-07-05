import { ref, computed, onBeforeUnmount, type Ref } from 'vue'
import Panzoom from '@panzoom/panzoom'
import type { PanzoomObject } from '@panzoom/panzoom'
import { statsListenerAdded, statsListenerRemoved } from '../utils/pdfSignerStats'

interface PanzoomEventDetail {
  scale: number
  x: number
  y: number
  originalEvent?: Event
}

interface PanzoomEvent extends CustomEvent {
  detail: PanzoomEventDetail
}

const MAX_ZOOM_LEVEL = 4

/**
 * A Vue composable to manage Panzoom functionality.
 * @param panzoomContainer - A ref to the element that will be panned and zoomed.
 * @param viewportRef - A ref to the parent viewport element, used for boundaries and centering.
 */
export function usePanZoom(
  panzoomContainer: Ref<HTMLDivElement | null>,
  viewportRef: Ref<HTMLDivElement | null>,
) {
  // --- START: Reactive State ---
  const panzoom = ref<PanzoomObject | null>(null)
  const currentZoom = ref(1)
  const zoomPercentage = computed(() => Math.round(currentZoom.value * 100))
  // --- END: Reactive State ---

  // Removes the listeners attached by the most recent initPanzoom() call.
  // panzoom.destroy() only unbinds panzoom's own internal handlers, so the
  // listeners we attach ourselves must be removed explicitly or they stack up
  // on every re-init (page change, re-render) and leak on unmount.
  let detachListeners: (() => void) | null = null

  /**
   * Checks if the content is overflowing the viewport and enables/disables panning.
   */
  function updatePanState() {
    if (!panzoom.value || !panzoomContainer.value || !viewportRef.value) return
    const pz = panzoom.value
    const contentRect = panzoomContainer.value.getBoundingClientRect()
    const viewportRect = viewportRef.value.getBoundingClientRect()

    const fitsHorizontally = contentRect.width <= viewportRect.width
    const fitsVertically = contentRect.height <= viewportRect.height

    if (fitsHorizontally && fitsVertically) {
      pz.setOptions({ disablePan: true })
      pz.pan(0, 0, { animate: false })
    } else {
      pz.setOptions({
        disablePan: false,
        contain: 'outside',
      })
    }
  }

  /** Zoom in by a controlled increment */
  function zoomIn() {
    if (!panzoom.value || !viewportRef.value) return
    const newScale = panzoom.value.getScale() * 1.25
    const viewportRect = viewportRef.value.getBoundingClientRect()
    const centerX = viewportRect.width / 2
    const centerY = viewportRect.height / 2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    panzoom.value.zoomToPoint(newScale, { clientX: centerX, clientY: centerY } as any, {
      animate: true,
    })
  }

  /** Zoom out by a controlled increment */
  function zoomOut() {
    if (!panzoom.value || !viewportRef.value) return
    const newScale = panzoom.value.getScale() * 0.8
    const viewportRect = viewportRef.value.getBoundingClientRect()
    const centerX = viewportRect.width / 2
    const centerY = viewportRect.height / 2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    panzoom.value.zoomToPoint(newScale, { clientX: centerX, clientY: centerY } as any, {
      animate: true,
    })
  }

  /** Initializes Panzoom and attaches event listeners. */
  function initPanzoom() {
    if (!panzoomContainer.value || !viewportRef.value) return
    destroyPanzoom()

    const viewport = viewportRef.value
    const container = panzoomContainer.value

    const pz = Panzoom(container, {
      excludeClass: 'panzoom-exclude', // Let signature pad handle its own gestures.
      maxScale: MAX_ZOOM_LEVEL,
      minScale: 0.1,
      canvas: true,
      overflow: 'hidden',
      contain: 'outside',
      startScale: 1,
    })

    const onWheel = pz.zoomWithWheel
    const onPanzoomStart = (e: Event) => {
      e.preventDefault()
    }
    const onPanzoomZoom = (e: Event) => {
      const event = e as PanzoomEvent
      currentZoom.value = event.detail.scale
    }
    const onPanzoomEnd = () => {
      updatePanState()
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    statsListenerAdded('viewport', 'wheel')

    container.addEventListener('panzoomstart', onPanzoomStart)
    statsListenerAdded('panzoomContainer', 'panzoomstart')

    container.addEventListener('panzoomzoom', onPanzoomZoom)
    statsListenerAdded('panzoomContainer', 'panzoomzoom')

    container.addEventListener('panzoomend', onPanzoomEnd)
    statsListenerAdded('panzoomContainer', 'panzoomend')

    detachListeners = () => {
      viewport.removeEventListener('wheel', onWheel)
      statsListenerRemoved('viewport', 'wheel')
      container.removeEventListener('panzoomstart', onPanzoomStart)
      statsListenerRemoved('panzoomContainer', 'panzoomstart')
      container.removeEventListener('panzoomzoom', onPanzoomZoom)
      statsListenerRemoved('panzoomContainer', 'panzoomzoom')
      container.removeEventListener('panzoomend', onPanzoomEnd)
      statsListenerRemoved('panzoomContainer', 'panzoomend')
      detachListeners = null
    }

    panzoom.value = pz
    updatePanState() // Call this immediately after init
  }

  /** Destroys the Panzoom instance and cleans up listeners. */
  function destroyPanzoom() {
    detachListeners?.()
    if (panzoom.value) {
      panzoom.value.destroy()
      panzoom.value = null
    }
  }

  onBeforeUnmount(destroyPanzoom)

  return {
    panzoom,
    currentZoom,
    zoomPercentage,
    initPanzoom,
    destroyPanzoom,
    updatePanState,
    zoomIn,
    zoomOut,
  }
}
