/**
 * Development environment entry point
 * Initializes the development environment and loads the selected effect
 */

import './ui' // Import styles via UI index
import { printStartupBanner } from '@lightscript/core/utils/debug'
import { discoverEffects } from '../../../src/effects'
import { PreactDevEngine } from './engine/preact-engine'

// Display startup banner
printStartupBanner()

// Discover effects from file system
const effectModules = discoverEffects()
const effectIds = Object.keys(effectModules).sort()

// Initialize effect from URL parameter or use the first effect
const urlParams = new URLSearchParams(window.location.search)
const effectId = urlParams.get('effect') || effectIds[0]

console.log(`✨ Loading effect: ${effectId}`)

/**
 * Initialize the development environment
 */
async function initializeDevEnvironment() {
    console.log('🔧 Initializing environment...')

    try {
        // Initialize PreactDevEngine for UI and controls first
        const engine = new PreactDevEngine()

        // Load effect module
        const loadEffect = effectModules[effectId]
        if (!loadEffect) {
            throw new Error(`Effect not found: ${effectId}`)
        }

        // Dynamic import with cache-busting
        await loadEffect()

        console.log(`✅ Loaded effect module: ${effectId}`)

        try {
            await engine.initialize()
            console.log('✨ Engine initialized successfully')

            // Display welcome notification
            engine.showNotification('Welcome to the LightScript Workshop!')
        } catch (err) {
            console.error('❌ Error initializing engine:', err)
        }
    } catch (error) {
        console.error('❌ Failed to load effect:', error)
    }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeDevEnvironment)
