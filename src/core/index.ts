/**
 * Core framework index
 * Re-exports all core components for the LightScript framework
 */

// Export control system
export * from './controls'
// Export effect classes
export * from './effects'

// Export utilities
export * from './utils'

/**
 * Initialize SignalRGB effect on load
 * @param initFunction - Function to call for initialization
 */
export function initializeEffect(initFunction: () => void): void {
    // Skip initialization if we're just preloading metadata
    if (window.effectInstance?._preventInitialization) {
        return
    }

    // Try immediate initialization
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initFunction()
    } else {
        // Wait for load event
        window.addEventListener('load', initFunction)

        // Backup with timeout
        setTimeout(() => {
            // Check again in case the flag was set during the timeout
            if (!window.effectInstance?._preventInitialization) {
                initFunction()
            }
        }, 1000)
    }
}
