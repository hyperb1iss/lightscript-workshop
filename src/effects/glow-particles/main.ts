/**
 * GlowParticles - Entry Point
 * A colorful particle system with glowing effects using Canvas 2D
 */
import { initializeEffect } from '../../core'
import { GlowParticlesEffect } from './glow-particles-effect'

// Create effect instance
const effect = new GlowParticlesEffect()

// Initialize the effect using the common initializer for SignalRGB
console.log('📣 Setting up effect initialization')

initializeEffect(() => {
    console.log('🚀 GlowParticles initialization callback triggered')

    try {
        console.log('🔍 Starting initialize() method')
        effect
            .initialize()
            .then(() => {
                console.log('✨ GlowParticles initialized successfully')
            })
            .catch((error) => {
                console.error('💥 GlowParticles initialization failed:', error)
            })
    } catch (error) {
        console.error('💔 Fatal error during GlowParticles initialization:', error)
    }
})

console.log('📋 Module initialization complete, waiting for callback')

// Export the effect instance
export default effect

// Re-export types and components for external use
export { GlowParticlesEffect } from './glow-particles-effect'
export type { GlowParticlesControls } from './types'
