/**
 * GlowParticles - Types and Constants
 * Physics-based particle system configuration
 */

// Define control interface - simplified but powerful
export interface GlowParticlesControls {
    speed: number
    particleCount: number
    particleSize: number
    chaos: number // Combines turbulence + vortex
    clustering: number // Combines attraction + charge influence
    networkActivity: number
    glowIntensity: number
    colorMode: number
    connectParticles: boolean
    connectionDistance: number
    connectorGlow: number
    ambience: number // Background nebula clouds and ambient glow
    nodeBrightness: number // How bright/intense nodes appear
    ambienceShift: number // Hue shift for background colors
}

// Color modes - more dynamic and physics-reactive
export const COLOR_MODES = [
    'Plasma', // Swirling plasma based on position + velocity
    'Velocity Rainbow', // Color = direction of movement
    'Fire', // Hot colors intensify with speed
    'Electric', // Cyan/white lightning
    'Toxic', // Greens and yellows
    'Nebula', // Deep space purples
    'Ocean', // Blues with foam at high energy
    'Sunset', // Warm gradient
    'Northern Lights', // Aurora flow
    'Cyberpunk', // Pink/cyan/purple
    'Monochrome Energy', // White intensity = speed
    'Rainbow Cycle', // Classic cycling rainbow
]

// Gravity presets (angles in degrees)
export const GRAVITY_PRESETS = {
    CENTER: -1, // Special value for center attraction
    DOWN: 0,
    LEFT: 270,
    NONE: -2, // Special value for no gravity direction
    RIGHT: 90,
    UP: 180,
}
