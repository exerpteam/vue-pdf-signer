import { ref, watchEffect } from 'vue'

// This is the central switch for all debug-related features.
// It's initialized from the Vite environment variable, but can be
// overridden at runtime by the component prop.
export const isDebug = ref(import.meta.env.VITE_APP_DEBUG_MODE === 'true')

// This is the manual toggle for the log format.
// false = log as objects (default), true = log as JSON strings.
// This is useful for debugging on mobile devices where console output
// may not show objects properly.
const logAsString = ref(true)

/**
 * A simple logger that respects the isDebug flag.
 * It also handles objects for better remote debugging.
 */
function toggleLogFormat() {
  logAsString.value = !logAsString.value
  console.log(`[PdfSigner] Log format switched to: ${logAsString.value ? 'JSON String' : 'Object'}`)
}

// This effect cleanly adds/removes the toggle function from the global scope
// based on whether debug mode is active.
watchEffect(() => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const global = window as any
    if (isDebug.value) {
      global.togglePdfSignerLogFormat = toggleLogFormat
    } else if (global.togglePdfSignerLogFormat) {
      delete global.togglePdfSignerLogFormat
    }
  }
})

/**
 * Logs a debug message to the console if debug mode is enabled.
 * @param message - The primary message to log.
 * @param optionalParams - Additional data to log. Objects will be deep-cloned
 *                         and stringified for better inspection on mobile.
 */
export const logger = {
  debug(message: string, ...optionalParams: unknown[]): void {
    if (!isDebug.value) {
      return
    }

    const prefix = `[PdfSigner DEBUG] ${message}`

    if (logAsString.value) {
      // If true, we stringify everything for guaranteed visibility.
      const stringifiedParams = optionalParams.map((param) => {
        try {
          // Using pretty-printing (null, 2) for better readability.
          return JSON.stringify(param, null, 2)
        } catch {
          return '[Unserializable Object]'
        }
      })
      console.log(prefix, ...stringifiedParams)
    } else {
      // If false, we use the previous object-based logging attempt.
      const processedParams = optionalParams.map((param) => {
        if (typeof param === 'object' && param !== null) {
          try {
            // A simple deep clone to avoid logging proxies
            return JSON.parse(JSON.stringify(param))
          } catch {
            return '[Unserializable Object]'
          }
        }
        return param
      })

      if (processedParams.length === 0) {
        console.log(prefix)
      } else if (processedParams.length === 1) {
        console.log(prefix, processedParams[0])
      } else {
        console.log(prefix, processedParams)
      }
    }
  },

  /**
   * Logs a warning message to the console. Not affected by debug mode.
   */
  warn(message: string, ...optionalParams: unknown[]): void {
    console.warn(`[PdfSigner WARN] ${message}`, ...optionalParams)
  },

  /**
   * Logs an error message to the console. Not affected by debug mode.
   */
  error(message: string, ...optionalParams: unknown[]): void {
    console.error(`[PdfSigner ERROR] ${message}`, ...optionalParams)
  },
}
