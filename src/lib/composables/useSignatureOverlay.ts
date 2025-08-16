import { computed, ref, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { logger } from '../utils/debug'
import type { SignaturePlacement } from '../types'
import type { RenderedPage } from './usePdfRenderer'

const PDF_DPI = 72
const CM_TO_INCH = 1 / 2.54
const CM_TO_PX = PDF_DPI * CM_TO_INCH // ~28.346 px per cm at 72 DPI

/**
 * A Vue composable to calculate the styles for the signature preview overlays.
 * @param renderedPages - A ref to the array of rendered page data from the renderer.
 * @param pdfContainer - A ref to the container holding all canvas elements.
 * @param signatureData - A ref to the array of signature placement configurations from props.
 * @param showSignatureBounds - A ref to the prop that toggles the visibility of debug borders.
 */
export function useSignatureOverlay(
  renderedPages: Ref<RenderedPage[]>,
  pdfContainer: Ref<HTMLDivElement | null>,
  signatureData: Ref<SignaturePlacement[]>,
  showSignatureBounds: Ref<boolean>,
) {
  // --- START: Reactive Dimension Tracking ---
  const containerClientWidth = ref(0)

  useResizeObserver(pdfContainer, (entries) => {
    const el = entries[0].target as HTMLElement
    containerClientWidth.value = el.clientWidth
  })
  // --- END: Reactive Dimension Tracking ---

  const signatureStyles = computed(() => {
    if (!pdfContainer.value || renderedPages.value.length === 0) {
      return []
    }

    const placements =
      signatureData.value.length > 0
        ? signatureData.value
        : [{ left: 5, top: 7, width: 8, height: 4, page: 1 }]

    const containerWidth = containerClientWidth.value

    // we create a Map for efficient lookups of page data by page number.
    const pageMap = new Map(renderedPages.value.map((p) => [p.pageNum, p]))

    return placements
      .map((placement) => {
        const pageInfo = pageMap.get(placement.page)

        // If the placement is for a page that hasn't been rendered, we skip it.
        if (!pageInfo) {
          logger.warn(`Signature placement for non-existent page ${placement.page} skipped.`)
          return null
        }

        const { canvas, originalWidth } = pageInfo
        const canvasWidth = canvas.clientWidth
        const canvasTopOffset = canvas.offsetTop // This is the key to multi-page positioning.

        if (canvasWidth === 0 || originalWidth === 0) return null

        const currentScale = canvasWidth / originalWidth
        const canvasLeftOffset = Math.max(0, (containerWidth - canvasWidth) / 2)

        // Convert cm values from props to pixel values scaled to the current display size.
        const leftPx = placement.left * CM_TO_PX * currentScale
        const topPx = placement.top * CM_TO_PX * currentScale
        const widthPx = placement.width * CM_TO_PX * currentScale
        const heightPx = placement.height * CM_TO_PX * currentScale

        // The final position is relative to the pdfContainer, accounting for the specific
        // canvas's position within that container.
        const finalLeft = canvasLeftOffset + leftPx
        const finalTop = canvasTopOffset + topPx

        const baseStyle = {
          position: 'absolute' as const,
          left: `${finalLeft}px`,
          top: `${finalTop}px`,
          width: `${widthPx}px`,
          height: `${heightPx}px`,
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
      .filter((style): style is NonNullable<typeof style> => style !== null)
  })

  return {
    signatureStyles,
  }
}
