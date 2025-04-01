/**
 * Common utilities index
 * Re-exports all shared utilities for easier imports
 */

// Debug utilities
export * from './debug';

// Control interfaces and helpers
export * from './controls';

// WebGL and Three.js utilities
export * from './webgl';

/**
 * Initialize SignalRGB effect on load
 * @param initFunction - Function to call for initialization
 */
export function initializeEffect(initFunction: () => void): void {
  // Try immediate initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initFunction();
  } else {
    // Wait for load event
    window.addEventListener('load', initFunction);
    
    // Backup with timeout
    setTimeout(() => {
      initFunction();
    }, 1000);
  }
} 