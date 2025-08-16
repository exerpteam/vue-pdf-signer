/**
 * Pauses execution for a specified duration.
 * @param ms - The number of milliseconds to wait.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
