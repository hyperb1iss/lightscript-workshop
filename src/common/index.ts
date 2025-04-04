/**
 * Common utilities index
 * Re-exports all shared utilities for easier imports
 */

// Debug utilities
export * from "./debug";

// Legacy control interfaces and helpers
// Export directly to maintain backward compatibility with existing effects
export * from "./controls";

// New control system exports
export * from "./definitions";
export * from "./parser";
export * from "./registry";

// Base effect classes
export * from "./effect";
export * from "./webgl-effect";
export * from "./canvas-effect";

// Development engine - Preact UI
export * from "./preact-engine";

// WebGL and Three.js utilities
export * from "./webgl";

/**
 * Initialize SignalRGB effect on load
 * @param initFunction - Function to call for initialization
 */
export function initializeEffect(initFunction: () => void): void {
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
      initFunction();
    }, 1000);
  }
}
