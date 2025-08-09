/**
 * SimpleWave - Decorator-based implementation
 * Wave-based RGB effect with minimal resource usage
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
        waveCount: number
        colorMode: string | number
        colorSpeed: number
        reverseDirection: boolean | number
        colorIntensity: number
        waveHeight: number
    }
}

/**
 * SimpleWaveControls interface for TypeScript type checking
 */
export interface SimpleWaveDecoratorControls {
    speed: number
    waveCount: number
    colorMode: string | number
    colorSpeed: number
    reverseDirection: boolean | number
    colorIntensity: number
    waveHeight: number
}

/**
 * Decorator-based SimpleWave effect implementation
 */
@Effect({
    author: 'hyperb1iss',
    description: 'A simple wave-based RGB effect with minimal resource usage',
    name: 'Simple Wave',
})
export class SimpleWaveDecoratorEffect extends WebGLEffect<SimpleWaveDecoratorControls> {
    // Define color mode options for conversion
    private readonly colorModes = ['Rainbow', 'Ocean', 'Fire', 'Neon', 'Mono']

    // Control properties with decorators
    @NumberControl({
        default: 5,
        label: 'Animation Speed',
        max: 10,
        min: 1,
        tooltip: 'Controls the speed of the wave animation (1=Slow, 10=Fast)',
    })
    speed!: number

    @NumberControl({
        default: 5,
        label: 'Wave Count',
        max: 20,
        min: 1,
        tooltip: 'Number of waves displayed across the width',
    })
    waveCount!: number

    @ComboboxControl({
        default: 'Rainbow',
        label: 'Color Mode',
        tooltip: 'Select the color palette for the waves',
        values: ['Rainbow', 'Ocean', 'Fire', 'Neon', 'Mono'],
    })
    colorMode!: string

    @NumberControl({
        default: 3,
        label: 'Color Transition',
        max: 10,
        min: 1,
        tooltip: 'Controls how quickly colors transition (1=Slow, 10=Fast)',
    })
    colorSpeed!: number

    @BooleanControl({
        default: false,
        label: 'Reverse Direction',
        tooltip: 'Reverse the direction of wave movement',
    })
    reverseDirection!: boolean

    @NumberControl({
        default: 100,
        label: 'Color Intensity',
        max: 200,
        min: 1,
        tooltip: 'Adjust the intensity of colors (100=Normal, 200=Brighter)',
    })
    colorIntensity!: number

    @NumberControl({
        default: 50,
        label: 'Wave Height',
        max: 100,
        min: 1,
        tooltip: 'Controls how high the waves appear (percentage of display height)',
    })
    waveHeight!: number

    constructor() {
        super({
            debug: true,
            fragmentShader,
            id: 'simple-wave-decorator',
            name: 'Simple Wave (Decorator)',
        })
    }

    /**
     * Initialize the controls and their default values
     */
    protected initializeControls(): void {
        // Set default values to make them available globally for SignalRGB
        window.speed = 5
        window.waveCount = 5
        window.colorMode = 'Rainbow'
        window.colorSpeed = 3
        window.reverseDirection = 0
        window.colorIntensity = 100
        window.waveHeight = 50
    }

    /**
     * Get current control values from global scope
     * We're reading from the global window object for compatibility
     */
    protected getControlValues(): SimpleWaveDecoratorControls {
        // Handle colorMode string/number conversion
        let colorMode: number | string = window.colorMode

        if (typeof colorMode === 'string') {
            const modeIndex = this.colorModes.indexOf(colorMode)
            colorMode = modeIndex === -1 ? 0 : modeIndex
        } else {
            colorMode = Number(colorMode || 0)
        }

        return {
            colorIntensity: Number(window.colorIntensity ?? 100) / 100,
            colorMode,
            colorSpeed: normalizeSpeed(window.colorSpeed ?? 3),
            reverseDirection: boolToInt(window.reverseDirection ?? 0),
            speed: normalizeSpeed(window.speed ?? 5),
            waveCount: Number(window.waveCount ?? 5),
            waveHeight: (window.waveHeight ?? 50) / 100,
        }
    }

    /**
     * Create custom uniforms specific to this effect
     */
    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iColorIntensity: { value: 1.0 },
            iColorMode: { value: 0 },
            iColorSpeed: { value: 1.0 },
            iReverseDirection: { value: false },
            iSpeed: { value: 1.0 },
            iWaveCount: { value: 5.0 },
            iWaveHeight: { value: 0.5 },
        }
    }

    /**
     * Update shader uniforms based on control values
     */
    protected updateUniforms(controls: SimpleWaveDecoratorControls): void {
        if (!this.material) return

        this.material.uniforms.iSpeed.value = controls.speed
        this.material.uniforms.iWaveCount.value = controls.waveCount
        this.material.uniforms.iColorMode.value = controls.colorMode
        this.material.uniforms.iColorSpeed.value = controls.colorSpeed
        this.material.uniforms.iReverseDirection.value = controls.reverseDirection === 1
        this.material.uniforms.iColorIntensity.value = controls.colorIntensity
        this.material.uniforms.iWaveHeight.value = controls.waveHeight
    }
}

// Create effect instance
const effect = new SimpleWaveDecoratorEffect()

// Initialize the effect using the common initializer for SignalRGB
initializeEffect(() => {
    console.log('[SimpleWaveDecorator] Initializing through common initializer')
    effect.initialize()
})

// Export the effect instance
export default effect
