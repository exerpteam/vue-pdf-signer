/**
 * Returns the integer major version of iOS/iPadOS (e.g., 16) if running on
 * an Apple mobile device, otherwise returns null.
 *
 * This function is designed to be resilient to modern iPadOS user agents that
 * identify as desktop Macs.
 */
export function getIosMajorVersion(): number | null {
  // Ensure we are in a browser environment.
  if (typeof navigator === 'undefined' || !navigator.userAgent) {
    return null
  }

  const ua = navigator.userAgent
  const platform =
    navigator.platform ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((navigator as any).userAgentData && (navigator as any).userAgentData.platform) ||
    ''
  const maxTouchPoints = navigator.maxTouchPoints || 0

  // --- Step 1: Identify if the device is an iPhone, iPod, or iPad. ---
  const isModernIpad = platform === 'MacIntel' && maxTouchPoints > 1
  const isLegacyAppleDevice = /iPad|iPhone|iPod/.test(platform) || /iPad|iPhone|iPod/.test(ua)

  if (!isModernIpad && !isLegacyAppleDevice) {
    return null // Not an iOS/iPadOS device.
  }

  // --- Step 2: Attempt to extract the OS version from the user agent. ---

  // Strategy 1: Look for the reliable "CPU OS" token. This works for most
  // real devices and non-Safari browsers on iOS.
  let osMatch = ua.match(/CPU (?:iPhone )?OS (\d+)_/i)

  // Strategy 2 (Fallback): If the first match fails AND we've identified it
  // as a modern iPad (which fakes a Mac user agent), look for the "Version/"
  // token. This is common in the simulator and Safari on iPadOS.
  if (!osMatch && isModernIpad) {
    osMatch = ua.match(/Version\/(\d+)\./i)
  }

  if (osMatch && osMatch[1]) {
    const majorVersion = Number.parseInt(osMatch[1], 10)
    return isNaN(majorVersion) ? null : majorVersion
  }

  // If neither strategy works, we cannot determine the version.
  return null
}
