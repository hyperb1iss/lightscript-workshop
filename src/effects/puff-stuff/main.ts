/**
 * PuffStuff - Raymarched tunnel effect with dynamic colors and styles
 */

import * as THREE from 'three'
import { initializeEffect } from '../../core'
import { BooleanControl, ComboboxControl, Effect, NumberControl } from '../../core/controls/decorators'
import { boolToInt, normalizeSpeed } from '../../core/controls/helpers'
import { WebGLEffect } from '../../core/effects/webgl-effect'

// Import shaders
import fragmentShader from './fragment.glsl'

// Interface with window properties for type-safety
declare global {
    interface Window {
        speed: number
        colorShift: boolean | number
        colorScheme: string | number
        effectStyle: string | number
        colorIntensity: number
        colorPulse: number
        motionWave: number
        motionReverse: boolean | number
        colorSaturation: number
        // New powerful controls
        tunnelWidth: number
        cameraTilt: number
        surfaceRoughness: number
        fogDensity: number
        zoomFOV: number
        colorCycleSpeed: number
    }
}

// Define control interface
export interface PuffStuffControls {
    speed: number
    colorShift: boolean | number
    colorScheme: string | number
    effectStyle: string | number
    colorIntensity: number
    colorPulse: number
    motionWave: number
    motionReverse: boolean | number
    colorSaturation: number
    // New powerful controls
    tunnelWidth: number
    cameraTilt: number
    surfaceRoughness: number
    fogDensity: number
    zoomFOV: number
    colorCycleSpeed: number
}

/**
 * PuffStuff tunnel effect implementation
 */
@Effect({
    author: 'hyperb1iss',
    description: 'A WebGL ray marched tunnel effect with dynamic colors and styles',
    name: 'Puff Stuff Tunnel',
})
export class PuffStuffEffect extends WebGLEffect<PuffStuffControls> {
    // Color scheme options for conversion
    private readonly colorSchemes = [
        'Classic Blue',
        'Cyberpunk',
        'Fire',
        'Toxic',
        'Ethereal',
        'Monochrome',
        'Rainbow',
        'Electric',
        'Amethyst',
        'Coral Reef',
        'Deep Sea',
        'Emerald',
        'Neon',
        'Rose Gold',
        'Sunset',
        'Vapor Wave',
    ]

    // Effect style options for conversion
    private readonly effectStyles = ['Standard', 'Wireframe', 'Glitch', 'Hologram', 'Film Noir']

    @NumberControl({
        default: 5,
        label: 'Animation Speed',
        max: 10,
        min: 1,
        tooltip: 'Controls the speed of the animation effect (1=Slow, 10=Fast)',
    })
    speed!: number

    @BooleanControl({
        default: true,
        label: 'Color Shift',
        tooltip: 'Toggles additional color shifting effects',
    })
    colorShift!: boolean

    @ComboboxControl({
        default: 'Classic Blue',
        label: 'Color Scheme',
        tooltip: 'Select the color palette for the tunnel',
        values: [
            'Classic Blue',
            'Cyberpunk',
            'Fire',
            'Toxic',
            'Ethereal',
            'Monochrome',
            'Rainbow',
            'Electric',
            'Amethyst',
            'Coral Reef',
            'Deep Sea',
            'Emerald',
            'Neon',
            'Rose Gold',
            'Sunset',
            'Vapor Wave',
        ],
    })
    colorScheme!: string

    @ComboboxControl({
        default: 'Standard',
        label: 'Effect Style',
        tooltip: 'Choose the visual style of the effect',
        values: ['Standard', 'Wireframe', 'Glitch', 'Hologram', 'Film Noir'],
    })
    effectStyle!: string

    @NumberControl({
        default: 100,
        label: 'Color Intensity',
        max: 200,
        min: 1,
        tooltip: 'Adjust the intensity of colors (0=Muted, 100=Normal, 200=Vibrant)',
    })
    colorIntensity!: number

    @NumberControl({
        default: 0,
        label: 'Color Pulse',
        max: 10,
        min: 0,
        tooltip: 'Add rhythmic color pulsing (0=Off, 10=Intense)',
    })
    colorPulse!: number

    @NumberControl({
        default: 0,
        label: 'Motion Wave',
        max: 10,
        min: 0,
        tooltip: 'Add wave distortion to the tunnel (0=None, 10=Maximum)',
    })
    motionWave!: number

    @BooleanControl({
        default: false,
        label: 'Reverse Direction',
        tooltip: 'Reverse the direction of tunnel movement',
    })
    motionReverse!: boolean

    @NumberControl({
        default: 100,
        label: 'Color Saturation',
        max: 200,
        min: 1,
        tooltip: 'Adjust the saturation level of colors (100=Normal, 200=Super Saturated)',
    })
    colorSaturation!: number

    // ═══════════════════════════════════════════════════════════════
    // NEW POWERFUL CONTROLS
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 5,
        label: 'Tunnel Width',
        max: 10,
        min: 1,
        tooltip: 'Claustrophobic tight (1) to vast cavernous (10)',
    })
    tunnelWidth!: number

    @NumberControl({
        default: 5,
        label: 'Camera Tilt',
        max: 10,
        min: 0,
        tooltip: 'How much the view rocks and sways (0=Stable, 10=Drunk)',
    })
    cameraTilt!: number

    @NumberControl({
        default: 5,
        label: 'Surface Texture',
        max: 10,
        min: 0,
        tooltip: 'Smooth glass walls (0) to organic alien flesh (10)',
    })
    surfaceRoughness!: number

    @NumberControl({
        default: 5,
        label: 'Fog Density',
        max: 10,
        min: 1,
        tooltip: 'Crystal clear (1) to thick atmospheric haze (10)',
    })
    fogDensity!: number

    @NumberControl({
        default: 5,
        label: 'Zoom / FOV',
        max: 10,
        min: 1,
        tooltip: 'Telephoto warp speed (1) to fisheye trippy (10)',
    })
    zoomFOV!: number

    @NumberControl({
        default: 5,
        label: 'Color Cycle Speed',
        max: 10,
        min: 0,
        tooltip: 'How fast colors shift and morph (0=Frozen, 10=Hyperdrive)',
    })
    colorCycleSpeed!: number

    constructor() {
        super({
            debug: true,
            fragmentShader,
            id: 'puff-stuff',
            name: 'PuffStuff',
        })
    }

    /**
     * Initialize the controls and their default values
     */
    protected initializeControls(): void {
        // Set default values to make them available globally for SignalRGB
        window.speed = 5
        window.colorShift = 1
        window.colorScheme = 'Classic Blue'
        window.effectStyle = 'Standard'
        window.colorIntensity = 100
        window.colorPulse = 0
        window.motionWave = 0
        window.motionReverse = 0
        window.colorSaturation = 100
        // New controls
        window.tunnelWidth = 5
        window.cameraTilt = 5
        window.surfaceRoughness = 5
        window.fogDensity = 5
        window.zoomFOV = 5
        window.colorCycleSpeed = 5
    }

    /**
     * Get current control values from global scope
     */
    protected getControlValues(): PuffStuffControls {
        // Handle colorScheme string/number conversion
        let colorScheme: number | string = window.colorScheme

        if (typeof colorScheme === 'string') {
            const schemeIndex = this.colorSchemes.indexOf(colorScheme)
            colorScheme = schemeIndex === -1 ? 0 : schemeIndex
        } else {
            colorScheme = Number(colorScheme || 0)
        }

        // Handle effectStyle string/number conversion
        let effectStyle: number | string = window.effectStyle

        if (typeof effectStyle === 'string') {
            const styleIndex = this.effectStyles.indexOf(effectStyle)
            effectStyle = styleIndex === -1 ? 0 : styleIndex
        } else {
            effectStyle = Number(effectStyle || 0)
        }

        return {
            cameraTilt: Number(window.cameraTilt ?? 5) / 5, // 0 to 2.0
            colorCycleSpeed: Number(window.colorCycleSpeed ?? 5) / 5, // 0 to 2.0
            colorIntensity: Number(window.colorIntensity ?? 100) / 100,
            colorPulse: Number(window.colorPulse ?? 0) / 10,
            colorSaturation: Number(window.colorSaturation ?? 100) / 100,
            colorScheme,
            colorShift: boolToInt(window.colorShift ?? 1),
            effectStyle,
            fogDensity: Number(window.fogDensity ?? 5) / 5, // 0.2 to 2.0
            motionReverse: boolToInt(window.motionReverse ?? 0),
            motionWave: Number(window.motionWave ?? 0) / 10,
            speed: normalizeSpeed(window.speed ?? 5),
            surfaceRoughness: Number(window.surfaceRoughness ?? 5) / 5, // 0 to 2.0
            // New controls - normalize to useful ranges
            tunnelWidth: Number(window.tunnelWidth ?? 5) / 5, // 0.2 to 2.0
            zoomFOV: Number(window.zoomFOV ?? 5) / 5, // 0.2 to 2.0
        }
    }

    /**
     * Create custom uniforms specific to this effect
     */
    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iCameraTilt: { value: 1.0 },
            iColorCycleSpeed: { value: 1.0 },
            iColorIntensity: { value: 1.0 },
            iColorPulse: { value: 0.0 },
            iColorSaturation: { value: 1.0 },
            iColorScheme: { value: 0 },
            iColorShift: { value: true },
            iEffectStyle: { value: 0 },
            iFogDensity: { value: 1.0 },
            iMotionReverse: { value: false },
            iMotionWave: { value: 0.0 },
            iSpeed: { value: 1.0 },
            iSurfaceRoughness: { value: 1.0 },
            // New uniforms
            iTunnelWidth: { value: 1.0 },
            iZoomFOV: { value: 1.0 },
        }
    }

    /**
     * Update shader uniforms based on control values
     */
    protected updateUniforms(controls: PuffStuffControls): void {
        if (!this.material) return

        this.material.uniforms.iSpeed.value = controls.speed
        this.material.uniforms.iColorShift.value = controls.colorShift === 1
        this.material.uniforms.iColorScheme.value = controls.colorScheme
        this.material.uniforms.iEffectStyle.value = controls.effectStyle
        this.material.uniforms.iColorIntensity.value = controls.colorIntensity
        this.material.uniforms.iColorPulse.value = controls.colorPulse
        this.material.uniforms.iMotionWave.value = controls.motionWave
        this.material.uniforms.iMotionReverse.value = controls.motionReverse === 1
        this.material.uniforms.iColorSaturation.value = controls.colorSaturation
        // New uniforms
        this.material.uniforms.iTunnelWidth.value = controls.tunnelWidth
        this.material.uniforms.iCameraTilt.value = controls.cameraTilt
        this.material.uniforms.iSurfaceRoughness.value = controls.surfaceRoughness
        this.material.uniforms.iFogDensity.value = controls.fogDensity
        this.material.uniforms.iZoomFOV.value = controls.zoomFOV
        this.material.uniforms.iColorCycleSpeed.value = controls.colorCycleSpeed
    }
}

// Create effect instance
const effect = new PuffStuffEffect()

// Initialize the effect using the common initializer for SignalRGB
initializeEffect(() => {
    console.log('[PuffStuff] Initializing through common initializer')
    effect.initialize()
})

// Export the effect instance
export default effect
