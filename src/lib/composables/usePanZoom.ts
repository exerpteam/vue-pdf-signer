import { ref, computed, onBeforeUnmount, type Ref } from 'vue'
import Panzoom from '@panzoom/panzoom'
import type { PanzoomObject } from '@panzoom/panzoom'

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
  let removePanzoomListeners: (() => void) | null = null
  // --- END: Reactive State ---

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
    removePanzoomListeners?.()
    panzoom.value?.destroy()

    const pz = Panzoom(panzoomContainer.value, {
      excludeClass: 'panzoom-exclude', // Let signature pad handle its own gestures.
      maxScale: MAX_ZOOM_LEVEL,
      minScale: 0.1,
      canvas: true,
      overflow: 'hidden',
      contain: 'outside',
      startScale: 1,
    })
    const viewportEl = viewportRef.value
    const containerEl = panzoomContainer.value

    const handleWheel = (event: WheelEvent) => pz.zoomWithWheel(event)
    const handlePanzoomStart = (event: Event) => {
      event.preventDefault()
    }
    const handlePanzoomZoom = (event: Event) => {
      const zoomEvent = event as PanzoomEvent
      currentZoom.value = zoomEvent.detail.scale
    }
    const handlePanzoomEnd = () => {
      updatePanState()
    }

    viewportEl.addEventListener('wheel', handleWheel, { passive: false })
    containerEl.addEventListener('panzoomstart', handlePanzoomStart)
    containerEl.addEventListener('panzoomzoom', handlePanzoomZoom)
    containerEl.addEventListener('panzoomend', handlePanzoomEnd)

    removePanzoomListeners = () => {
      viewportEl.removeEventListener('wheel', handleWheel)
      containerEl.removeEventListener('panzoomstart', handlePanzoomStart)
      containerEl.removeEventListener('panzoomzoom', handlePanzoomZoom)
      containerEl.removeEventListener('panzoomend', handlePanzoomEnd)
      removePanzoomListeners = null
    }

    panzoom.value = pz
    updatePanState() // Call this immediately after init
  }

  /** Destroys the Panzoom instance and cleans up listeners. */
  function destroyPanzoom() {
    removePanzoomListeners?.()
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
