/**
 * Cyber Descent - Main Effect Class
 * Implements the Cyber Descent effect using WebGL
 */

import * as THREE from 'three'
import { ComboboxControl, Effect, NumberControl } from '../../core/controls/decorators'
import { WebGLEffect } from '../../core/effects/webgl-effect'
// Import shader code
import fragmentShader from './fragment.glsl'
import { CYBERPUNK_MODES, CyberDescentControls } from './types'

// Interface with window properties for type-safety
declare global {
    interface Window {
        speed: number
        zoom: number
        cyberpunkMode: string | number
        fogDensity: number
        lightIntensity: number
        colorSaturation: number
        colorIntensity: number
    }
}

/**
 * Cyber Descent effect implementation using WebGL/Three.js
 */
@Effect({
    author: 'hyperb1iss',
    description: 'A cyberpunk city flying effect inspired by classic demos',
    name: 'Cyber Descent',
})
export class CyberDescentEffect extends WebGLEffect<CyberDescentControls> {
    @NumberControl({
        default: 5,
        label: 'Flight Speed',
        max: 10,
        min: 1,
        tooltip: 'Controls the speed of movement through the city (1=Slow, 10=Fast)',
    })
    speed!: number

    @NumberControl({
        default: 10,
        label: 'Camera Zoom',
        max: 20,
        min: 5,
        tooltip: 'Adjusts the field of view (5=Wide, 20=Narrow)',
    })
    zoom!: number

    @ComboboxControl({
        default: 'Standard',
        label: 'City Style',
        tooltip: 'Changes the overall style and color scheme of the city',
        values: CYBERPUNK_MODES,
    })
    cyberpunkMode!: string

    @NumberControl({
        default: 100,
        label: 'Fog Density',
        max: 200,
        min: 10,
        tooltip: 'Controls the density of the atmospheric fog effect',
    })
    fogDensity!: number

    @NumberControl({
        default: 100,
        label: 'Light Intensity',
        max: 200,
        min: 10,
        tooltip: 'Controls the brightness of the city lights',
    })
    lightIntensity!: number

    @NumberControl({
        default: 100,
        label: 'Color Saturation',
        max: 200,
        min: 0,
        tooltip: 'Adjust color saturation level (0=B&W, 100=Normal)',
    })
    colorSaturation!: number

    @NumberControl({
        default: 100,
        label: 'Color Intensity',
        max: 200,
        min: 10,
        tooltip: 'Adjust color brightness (100=Normal)',
    })
    colorIntensity!: number

    constructor() {
        super({
            debug: true, // Enable debug mode
            fragmentShader,
            id: 'cyber-descent',
            name: 'Cyber Descent',
        })

        // Add direct console log to verify constructor is called
        console.log('👋 CyberDescentEffect constructor called')
    }

    /**
     * Initialize the controls and their default values
     */
    protected initializeControls(): void {
        console.log('🎛️ Initializing controls')
        // Set default values for the controls
        window.speed = 5
        window.zoom = 10
        window.cyberpunkMode = CYBERPUNK_MODES[0]
        window.fogDensity = 100
        window.lightIntensity = 100
        window.colorSaturation = 100
        window.colorIntensity = 100
    }

    /**
     * Get current control values from global scope
     */
    protected getControlValues(): CyberDescentControls {
        // Handle cyberpunkMode conversion from string to number index
        let cyberpunkMode = 0

        if (typeof window.cyberpunkMode === 'string') {
            const modeIndex = CYBERPUNK_MODES.indexOf(window.cyberpunkMode)
            cyberpunkMode = modeIndex === -1 ? 0 : modeIndex
        } else {
            cyberpunkMode = Number(window.cyberpunkMode || 0)
        }

        return {
            colorIntensity: (window.colorIntensity ?? 100) / 100, // Normalize to 0-1 range
            colorSaturation: (window.colorSaturation ?? 100) / 100, // Normalize to 0-1 range
            cyberpunkMode,
            fogDensity: (window.fogDensity ?? 100) / 100, // Normalize to 0-1 range
            lightIntensity: (window.lightIntensity ?? 100) / 100, // Normalize to 0-1 range
            speed: (window.speed ?? 5) / 5, // Normalize to 0-1 range with max = 2
            zoom: (window.zoom ?? 10) / 10, // Scale zoom for shader use
        }
    }

    /**
     * Apply control values to the effect parameters
     */
    protected updateParameters(controls: CyberDescentControls): void {
        // Update uniforms is handled by the updateUniforms method
        super.updateParameters(controls)
    }

    /**
     * Create the uniforms for the shader
     */
    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iColorIntensity: { value: 1.0 },
            iColorSaturation: { value: 1.0 },
            iCyberpunkMode: { value: 0 },
            iFogDensity: { value: 1.0 },
            iLightIntensity: { value: 1.0 },
            iSpeed: { value: 1.0 },
            iZoom: { value: 1.0 },
        }
    }

    /**
     * Update the shader uniforms with current control values
     */
    protected updateUniforms(controls: CyberDescentControls): void {
        if (!this.material) {
            this.debug('error', 'Material not available for updating uniforms')
            return
        }

        // Update all uniform values based on controls
        this.material.uniforms.iSpeed.value = controls.speed
        this.material.uniforms.iZoom.value = controls.zoom
        this.material.uniforms.iCyberpunkMode.value = controls.cyberpunkMode
        this.material.uniforms.iFogDensity.value = controls.fogDensity
        this.material.uniforms.iLightIntensity.value = controls.lightIntensity
        this.material.uniforms.iColorSaturation.value = controls.colorSaturation
        this.material.uniforms.iColorIntensity.value = controls.colorIntensity
    }
}
