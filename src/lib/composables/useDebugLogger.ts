import { ref } from 'vue'
import { isDebug } from '../utils/debug'

const logs = ref<string[]>([])

function formatEntry(message: string, data?: unknown): string {
  const timestamp = new Date().toISOString()

  if (typeof data === 'undefined') {
    return `${timestamp} - ${message}`
  }

  let serialized: string
  try {
    const canCheckNode = typeof Node !== 'undefined'
    const canCheckWindow = typeof Window !== 'undefined'

    serialized =
      typeof data === 'string'
        ? data
        : JSON.stringify(
            data,
            (_key, value) => {
              if (canCheckNode && value instanceof Node) {
                return value.nodeName
              }
              if (canCheckWindow && value instanceof Window) {
                return '[Window]'
              }
              return value
            },
            2,
          )
  } catch {
    serialized = '[Unserializable Data]'
  }

  return `${timestamp} - ${message}\n${serialized}`
}

function log(message: string, data?: unknown): void {
  if (!isDebug.value) {
    return
  }

  logs.value.push(formatEntry(message, data))
}

async function copyLogs(): Promise<void> {
  if (!isDebug.value) {
    return
  }

  const textToCopy = logs.value.join('\n\n')

  if (!textToCopy) {
    return
  }

  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    console.warn('[PdfSigner DEBUG] Clipboard API unavailable')
    return
  }

  await navigator.clipboard.writeText(textToCopy)
}

function clearLogs(): void {
  if (!isDebug.value) {
    return
  }

  logs.value = []
}

export function useDebugLogger() {
  return {
    logs,
    log,
    copyLogs,
    clearLogs,
  }
}
