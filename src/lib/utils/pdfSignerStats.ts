// Flag-gated runtime diagnostics for the renderer-crash investigation.
//
// The host page opts in by setting `window.__PDF_SIGNER_DEBUG = true` before the
// component initializes; the flag is re-checked at every PdfSigner setup, so a test
// harness only has to set it before the first mount, not before module evaluation.
// When the flag is off, every hook below reduces to a single null check: no object,
// array, listener or timer is ever allocated on the disabled path.
//
// Once enabled, the stats object lives on `window.__pdfSignerStats` for the page
// lifetime so counters survive component remounts — cross-mount accumulation is
// exactly what needs measuring. All bookkeeping is plain counter arithmetic on
// preallocated objects; nothing is serialized outside the cycle-boundary
// breadcrumbs (mount/unmount/sign-step), so the instrumentation cannot perturb
// render or listener hot paths.
//
// Counter semantics: counters observe the library's EXPLICIT calls only.
// Listeners reclaimed by GC without a removeEventListener call do NOT decrement
// activeListeners — activeListeners/activeDocs mean "explicit adds minus explicit
// removes", not a live-resource gauge. With teardown in place the healthy at-rest
// invariants are: activeListeners == 0, activeDocs == 0, created == destroyed,
// and renderTasksStarted == renderTasksCompleted + renderTasksCancelled
// (cancellations are legitimate under supersession/teardown churn).

export interface PdfSignerStatsCounters {
  componentMounts: number
  componentUnmounts: number
  listenersAdded: number
  listenersRemoved: number
  activeListeners: number
  pdfDocsCreated: number
  pdfDocsDestroyed: number
  activeDocs: number
  loadingTasksStarted: number
  loadingTasksDestroyed: number
  renderTasksStarted: number
  renderTasksCompleted: number
  renderTasksCancelled: number
  canvasesCreated: number
  maxCanvasPixels: number
}

export interface PdfSignerStatsMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

export interface PdfSignerStatsSnapshot {
  /** Wall-clock ms (Date.now()) — aligns with CI log timestamps. */
  t: number
  /** Monotonic ms (performance.now(), rounded) — for intra-run deltas. */
  tMono: number
  /** 'mount' | 'unmount' | 'sign-step:<step>' */
  label: string
  detail?: string
  counters: PdfSignerStatsCounters
  memory: PdfSignerStatsMemory | null
}

export interface PdfSignerStatsEvent {
  t: number
  kind: string
  detail?: string
}

export interface PdfSignerStats {
  startedAt: number
  counters: PdfSignerStatsCounters
  /** Per `target:type` listener add/remove counts, e.g. 'viewport:wheel'. */
  listenerBreakdown: Record<string, { added: number; removed: number }>
  /** One entry per mount/unmount/sign-step boundary, unbounded. */
  snapshots: PdfSignerStatsSnapshot[]
  /** Bounded ring buffer — oldest entries are dropped in chunks once full. */
  events: PdfSignerStatsEvent[]
  eventsDropped: number
}

const EVENT_BUFFER_SIZE = 500
// Dropping oldest entries in chunks keeps the buffer bounded without paying an
// array shift on every push.
const DROP_CHUNK = 50

// Stable breadcrumb order; keys match PdfSignerStatsCounters exactly so log lines
// can be parsed with /(\w+)=(\d+)\(([+-]\d+)\)/.
const COUNTER_KEYS: (keyof PdfSignerStatsCounters)[] = [
  'componentMounts',
  'componentUnmounts',
  'listenersAdded',
  'listenersRemoved',
  'activeListeners',
  'pdfDocsCreated',
  'pdfDocsDestroyed',
  'activeDocs',
  'loadingTasksStarted',
  'loadingTasksDestroyed',
  'renderTasksStarted',
  'renderTasksCompleted',
  'renderTasksCancelled',
  'canvasesCreated',
  'maxCanvasPixels',
]

let stats: PdfSignerStats | null = null

function flagEnabled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && (window as any).__PDF_SIGNER_DEBUG === true
}

function createCounters(): PdfSignerStatsCounters {
  return {
    componentMounts: 0,
    componentUnmounts: 0,
    listenersAdded: 0,
    listenersRemoved: 0,
    activeListeners: 0,
    pdfDocsCreated: 0,
    pdfDocsDestroyed: 0,
    activeDocs: 0,
    loadingTasksStarted: 0,
    loadingTasksDestroyed: 0,
    renderTasksStarted: 0,
    renderTasksCompleted: 0,
    renderTasksCancelled: 0,
    canvasesCreated: 0,
    maxCanvasPixels: 0,
  }
}

/**
 * Re-checks the enable flag and creates the global stats object on first enabled
 * call. Idempotent; called from PdfSigner's setup.
 */
export function statsInit(): void {
  if (stats || !flagEnabled()) return
  stats = {
    startedAt: Date.now(),
    counters: createCounters(),
    listenerBreakdown: {},
    snapshots: [],
    events: [],
    eventsDropped: 0,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__pdfSignerStats = stats
  // Deliberately NOT the [PDFSIGNER-STATS] prefix: boundary breadcrumbs must all
  // parse as counter lines; this sentinel only proves the flag reached the library.
  console.log('[PDFSIGNER-STATS-INIT] enabled')
}

/** True once statsInit() has run with the flag on. */
export function statsEnabled(): boolean {
  return stats !== null
}

function pushEvent(s: PdfSignerStats, kind: string, detail?: string): void {
  if (s.events.length >= EVENT_BUFFER_SIZE) {
    s.events.splice(0, DROP_CHUNK)
    s.eventsDropped += DROP_CHUNK
  }
  if (detail === undefined) {
    s.events.push({ t: Date.now(), kind })
  } else {
    s.events.push({ t: Date.now(), kind, detail })
  }
}

function readMemory(): PdfSignerStatsMemory | null {
  // performance.memory is non-standard (Chromium only) — copy the numbers, never
  // hold the live object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memory = typeof performance !== 'undefined' ? (performance as any).memory : undefined
  if (!memory) return null
  return {
    usedJSHeapSize: memory.usedJSHeapSize ?? 0,
    totalJSHeapSize: memory.totalJSHeapSize ?? 0,
    jsHeapSizeLimit: memory.jsHeapSizeLimit ?? 0,
  }
}

function formatBreadcrumb(
  label: string,
  detail: string | undefined,
  counters: PdfSignerStatsCounters,
  previous: PdfSignerStatsCounters | null,
  memory: PdfSignerStatsMemory | null,
): string {
  const parts: string[] = ['[PDFSIGNER-STATS]', label]
  for (const key of COUNTER_KEYS) {
    const current = counters[key]
    const delta = previous ? current - previous[key] : current
    parts.push(`${key}=${current}(${delta >= 0 ? '+' : ''}${delta})`)
  }
  if (memory) {
    parts.push(`heapUsedMB=${(memory.usedJSHeapSize / 1048576).toFixed(1)}`)
    parts.push(`heapTotalMB=${(memory.totalJSHeapSize / 1048576).toFixed(1)}`)
    parts.push(`heapLimitMB=${(memory.jsHeapSizeLimit / 1048576).toFixed(1)}`)
  }
  if (detail !== undefined) {
    parts.push(`detail=${detail.replace(/\s+/g, '_')}`)
  }
  return parts.join(' ')
}

/**
 * Cycle-boundary snapshot plus a single-line console breadcrumb. Only called on
 * mount/unmount/sign-step boundaries — never from render or listener hot paths.
 */
function snapshot(label: string, detail?: string): void {
  const s = stats
  if (!s) return
  const counters = { ...s.counters }
  const previous = s.snapshots.length > 0 ? s.snapshots[s.snapshots.length - 1].counters : null
  const memory = readMemory()
  const entry: PdfSignerStatsSnapshot = {
    t: Date.now(),
    tMono: Math.round(performance.now()),
    label,
    counters,
    memory,
  }
  if (detail !== undefined) {
    entry.detail = detail
  }
  s.snapshots.push(entry)
  console.log(formatBreadcrumb(label, detail, counters, previous, memory))
}

export function statsMounted(): void {
  const s = stats
  if (!s) return
  s.counters.componentMounts++
  pushEvent(s, 'mount')
  snapshot('mount')
}

export function statsUnmounted(): void {
  const s = stats
  if (!s) return
  s.counters.componentUnmounts++
  pushEvent(s, 'unmount')
  snapshot('unmount')
}

export function statsSignStep(step: string, detail?: string): void {
  const s = stats
  if (!s) return
  pushEvent(s, 'sign-step', detail === undefined ? step : `${step}:${detail}`)
  snapshot(`sign-step:${step}`, detail)
}

export function statsListenerAdded(target: string, type: string): void {
  const s = stats
  if (!s) return
  s.counters.listenersAdded++
  s.counters.activeListeners++
  const key = `${target}:${type}`
  const entry = s.listenerBreakdown[key] ?? (s.listenerBreakdown[key] = { added: 0, removed: 0 })
  entry.added++
  pushEvent(s, 'listener-add', key)
}

export function statsListenerRemoved(target: string, type: string): void {
  const s = stats
  if (!s) return
  s.counters.listenersRemoved++
  s.counters.activeListeners--
  const key = `${target}:${type}`
  const entry = s.listenerBreakdown[key] ?? (s.listenerBreakdown[key] = { added: 0, removed: 0 })
  entry.removed++
  pushEvent(s, 'listener-remove', key)
}

export function statsLoadingTaskStarted(): void {
  const s = stats
  if (!s) return
  s.counters.loadingTasksStarted++
  pushEvent(s, 'loading-task-start')
}

export function statsLoadingTaskDestroyed(): void {
  const s = stats
  if (!s) return
  s.counters.loadingTasksDestroyed++
  pushEvent(s, 'loading-task-destroy')
}

export function statsDocCreated(): void {
  const s = stats
  if (!s) return
  s.counters.pdfDocsCreated++
  s.counters.activeDocs++
  pushEvent(s, 'doc-create')
}

export function statsDocDestroyed(): void {
  const s = stats
  if (!s) return
  s.counters.pdfDocsDestroyed++
  s.counters.activeDocs--
  pushEvent(s, 'doc-destroy')
}

export function statsRenderTaskStarted(): void {
  const s = stats
  if (!s) return
  s.counters.renderTasksStarted++
  pushEvent(s, 'render-task-start')
}

export function statsRenderTaskCompleted(): void {
  const s = stats
  if (!s) return
  s.counters.renderTasksCompleted++
  pushEvent(s, 'render-task-complete')
}

export function statsRenderTaskCancelled(): void {
  const s = stats
  if (!s) return
  s.counters.renderTasksCancelled++
  pushEvent(s, 'render-task-cancel')
}

export function statsCanvasCreated(width: number, height: number): void {
  const s = stats
  if (!s) return
  s.counters.canvasesCreated++
  const pixels = width * height
  if (pixels > s.counters.maxCanvasPixels) {
    s.counters.maxCanvasPixels = pixels
  }
  pushEvent(s, 'canvas-create', `${width}x${height}`)
}
