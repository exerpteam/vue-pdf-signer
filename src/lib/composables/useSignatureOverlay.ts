import { computed, ref, watch, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { logger } from '../utils/debug'
import type { SignaturePlacement } from '../types'

const PDF_DPI = 72
const CM_TO_INCH = 1 / 2.54
const CM_TO_PX = PDF_DPI * CM_TO_INCH // ~28.346 px per cm at 72 DPI

/**
 * A Vue composable to calculate the styles for the signature preview overlays.
 * @param firstCanvasRef - A ref to the first rendered canvas element.
 * @param pdfContainer - A ref to the container holding all canvas elements.
 * @param originalPdfDimensions - A ref to the original, unscaled dimensions of the PDF page.
 * @param signatureData - A ref to the array of signature placement configurations from props.
 * @param showSignatureBounds - A ref to the prop that toggles the visibility of debug borders.
 */
export function useSignatureOverlay(
  firstCanvasRef: Ref<HTMLCanvasElement | null>,
  pdfContainer: Ref<HTMLDivElement | null>,
  originalPdfDimensions: Ref<{ width: number; height: number }>,
  signatureData: Ref<SignaturePlacement[]>,
  showSignatureBounds: Ref<boolean>,
) {
  // --- START: Reactive Dimension Tracking ---
  const containerClientWidth = ref(0)
  const canvasClientWidth = ref(0)
  const containerPaddingTop = ref(0)

  useResizeObserver(pdfContainer, (entries) => {
    const el = entries[0].target as HTMLElement
    containerClientWidth.value = el.clientWidth
  })

  useResizeObserver(firstCanvasRef, (entries) => {
    const el = entries[0].target as HTMLElement
    canvasClientWidth.value = el.clientWidth
  })

  watch(
    pdfContainer,
    (el) => {
      if (el) {
        const computedStyle = window.getComputedStyle(el)
        containerPaddingTop.value = parseFloat(computedStyle.paddingTop)
      }
    },
    { immediate: true },
  )
  // --- END: Reactive Dimension Tracking ---

  const signatureStyles = computed(() => {
    if (
      !firstCanvasRef.value ||
      !pdfContainer.value ||
      originalPdfDimensions.value.width === 0 ||
      canvasClientWidth.value === 0
    ) {
      return []
    }

    const canvasWidth = canvasClientWidth.value
    const containerWidth = containerClientWidth.value

    // Calculate the current scale based on the live canvas width vs the original PDF width.
    const currentScale = canvasWidth / originalPdfDimensions.value.width

    // Calculate the horizontal offset of the canvas within its container.
    const canvasLeftOffset = Math.max(0, (containerWidth - canvasWidth) / 2)

    // If signatureData is empty, we create a default placement for the preview.
    const placements =
      signatureData.value.length > 0
        ? signatureData.value
        : [{ left: 5, top: 7, width: 8, height: 4, page: 1 }]

    logger.debug('Recalculating Signature Overlay Styles', {
      canvasWidth,
      containerWidth,
      currentScale,
      canvasLeftOffset,
      containerPaddingTop: containerPaddingTop.value,
    })

    // We map over the placements to generate a style object for each one.
    // For now, we only support placements on the first page for the visual overlay.
    // This can be expanded later if needed.
    return placements
      .filter((p) => p.page === 1)
      .map((placement) => {
        // Convert cm values from props to pixel values in the PDF's coordinate space.
        const leftPx = placement.left * CM_TO_PX
        const topPx = placement.top * CM_TO_PX
        const widthPx = placement.width * CM_TO_PX
        const heightPx = placement.height * CM_TO_PX

        // Scale these pixel values to match the current display size of the canvas.
        const signatureLeft = leftPx * currentScale
        const signatureTop = topPx * currentScale
        const signatureWidth = widthPx * currentScale
        const signatureHeight = heightPx * currentScale

        // The final position must account for the canvas's offset within its container.
        const finalLeft = canvasLeftOffset + signatureLeft
        const finalTop = signatureTop + containerPaddingTop.value

        const baseStyle = {
          position: 'absolute' as const,
          left: `${finalLeft}px`,
          top: `${finalTop}px`,
          width: `${signatureWidth}px`,
          height: `${signatureHeight}px`,
          pointerEvents: 'none' as const,
        }

        if (showSignatureBounds.value) {
          return {
            ...baseStyle,
            border: '2px dashed rgba(0, 123, 255, 0.5)',
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
          }
        }
        return baseStyle
      })
  })

  return {
    signatureStyles,
  }
}
