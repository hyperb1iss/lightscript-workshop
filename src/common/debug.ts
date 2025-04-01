/**
 * Debug utility for SignalRGB lightscripts
 * Provides consistent logging with namespacing and optional filtering
 */

/**
 * Creates a debug logger function with a specific namespace
 * @param namespace - The namespace to prefix log messages with
 * @param enabled - Whether debug logging is enabled
 * @returns A function that logs messages with the specified namespace
 */
export function createDebugLogger(namespace: string, enabled = true) {
  return function debug(...args: any[]) {
    if (enabled) {
      console.log(`[${namespace}]`, ...args);
    }
  };
}

/**
 * Default debug logger with no namespace
 */
export function debug(...args: any[]) {
  console.log('[LightScript]', ...args);
} 