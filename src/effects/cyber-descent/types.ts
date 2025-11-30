/**
 * Cyber Descent - Types and Constants
 * Defines interfaces, types, and constants used by the Cyber Descent effect
 */

import { BaseControls } from '@lightscript/core'

// Define control interface
export interface CyberDescentControls extends BaseControls {
    speed: number
    zoom: number
    cyberpunkMode: number
    colorPalette: number
    fogDensity: number
    lightIntensity: number
    colorSaturation: number
    colorIntensity: number
    // Movement controls
    cameraPitch: number
    cameraRoll: number
    cameraYaw: number
    // Style controls
    buildingHeight: number
    neonFlash: number
    streetLights: number
    buildingFill: number
}

// City style modes - controls camera behavior and fog
export const CYBERPUNK_MODES = [
    'Standard', // Default balanced view
    'Fast Descent', // Faster, steeper dive
    'Neon', // Custom neon-heavy mode
]

// Color palettes - independent of city style
export const COLOR_PALETTES = [
    'Classic Cyber', // Original blue/purple
    'Blade Runner', // Amber/orange/gold
    'Synthwave', // Hot pink/electric blue
    'Matrix', // Green/black
    'Akira Red', // Red/orange
    'Ice', // Cyan/white/blue
    'Toxic', // Green/yellow
    'Noir', // Desaturated cool
]
