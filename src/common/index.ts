/**
 * Common utilities index
 * Re-exports all shared utilities for easier imports
 */

// Debug utilities
export * from "./debug";

// Control system interfaces and definitions
export * from "./controls";
export * from "./definitions";
export * from "./registry";

// Decorator-based control system
export * from "./control-decorators";

// Base effect classes
export * from "./effect";
export * from "./webgl-effect";
export * from "./canvas-effect";

// Development engine - Preact UI
// Export explicitly to avoid name conflicts with parser's EffectMetadata
export { PreactDevEngine } from "./preact-engine";
export type {
  EffectMetadata as PreactEffectMetadata,
  EffectWithMetadata,
} from "./preact-engine";

// WebGL and Three.js utilities
export * from "./webgl";

/**
 * Initialize SignalRGB effect on load
 * @param initFunction - Function to call for initialization
 */
export function initializeEffect(initFunction: () => void): void {
  // Skip initialization if we're just preloading metadata
  if (window.effectInstance?._preventInitialization) {
    return;
  }

  // Try immediate initialization
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    initFunction();
  } else {
    // Wait for load event
    window.addEventListener("load", initFunction);

    // Backup with timeout
    setTimeout(() => {
      // Check again in case the flag was set during the timeout
      if (!window.effectInstance?._preventInitialization) {
        initFunction();
      }
    }, 1000);
  }
}
