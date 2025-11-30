/**
 * Cyber Descent - Main Effect Class
 * Implements the Cyber Descent effect using WebGL
 */

import { ComboboxControl, Effect, NumberControl, WebGLEffect } from '@lightscript/core'
import * as THREE from 'three'
// Import shader code
import fragmentShader from './fragment.glsl'
import { COLOR_PALETTES, CYBERPUNK_MODES, CyberDescentControls } from './types'

// Interface with window properties for type-safety
declare global {
    interface Window {
        speed: number
        zoom: number
        cyberpunkMode: string | number
        colorPalette: string | number
        fogDensity: number
        lightIntensity: number
        colorSaturation: number
        colorIntensity: number
        // New movement controls
        cameraPitch: number
        cameraRoll: number
        cameraYaw: number
        // New style controls
        buildingHeight: number
        neonFlash: number
        streetLights: number
        buildingFill: number
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
        tooltip: 'Controls camera behavior and atmosphere',
        values: CYBERPUNK_MODES,
    })
    cyberpunkMode!: string

    @ComboboxControl({
        default: 'Classic Cyber',
        label: 'Color Palette',
        tooltip: 'Color scheme for windows, signs, fog, and lights',
        values: COLOR_PALETTES,
    })
    colorPalette!: string

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

    // ═══════════════════════════════════════════════════════════════
    // MOVEMENT CONTROLS
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 5,
        label: 'Camera Pitch',
        max: 10,
        min: 0,
        tooltip: 'Vertical angle (0=Look down, 5=Level, 10=Look up)',
    })
    cameraPitch!: number

    @NumberControl({
        default: 5,
        label: 'Camera Roll',
        max: 10,
        min: 0,
        tooltip: 'Banking angle (0=Tilt left, 5=Level, 10=Tilt right)',
    })
    cameraRoll!: number

    @NumberControl({
        default: 5,
        label: 'Camera Yaw',
        max: 10,
        min: 0,
        tooltip: 'Horizontal direction (0=Hard left, 5=Forward, 10=Hard right)',
    })
    cameraYaw!: number

    // ═══════════════════════════════════════════════════════════════
    // STYLE CONTROLS
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 5,
        label: 'Building Height',
        max: 10,
        min: 1,
        tooltip: 'How tall the buildings are (1=Low, 10=Skyscrapers)',
    })
    buildingHeight!: number

    @NumberControl({
        default: 5,
        label: 'Neon Flash',
        max: 10,
        min: 0,
        tooltip: 'Sign flashing intensity (0=Static, 10=Rave)',
    })
    neonFlash!: number

    @NumberControl({
        default: 5,
        label: 'Street Lights',
        max: 10,
        min: 0,
        tooltip: 'Flying light density (0=None, 10=Swarm)',
    })
    streetLights!: number

    @NumberControl({
        default: 2,
        label: 'Building Fill',
        max: 10,
        min: 0,
        tooltip: 'Surface detail for RGB (0=Dark gaps, 10=Full glow)',
    })
    buildingFill!: number

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
        window.colorPalette = COLOR_PALETTES[0]
        window.fogDensity = 100
        window.lightIntensity = 100
        window.colorSaturation = 100
        window.colorIntensity = 100
        // Movement controls (centered at 5 = neutral)
        window.cameraPitch = 5
        window.cameraRoll = 5
        window.cameraYaw = 5
        // Style controls
        window.buildingHeight = 5
        window.neonFlash = 5
        window.streetLights = 5
        window.buildingFill = 2
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

        // Handle colorPalette conversion from string to number index
        let colorPalette = 0
        if (typeof window.colorPalette === 'string') {
            const paletteIndex = COLOR_PALETTES.indexOf(window.colorPalette)
            colorPalette = paletteIndex === -1 ? 0 : paletteIndex
        } else {
            colorPalette = Number(window.colorPalette || 0)
        }

        return {
            buildingFill: (window.buildingFill ?? 2) / 10, // 0 to 1 range
            // Style: Normalize to shader-friendly ranges
            buildingHeight: (window.buildingHeight ?? 5) / 5, // 0.2 to 2.0 scale
            // Movement: Convert 0-10 slider to -1 to +1 range (5 = neutral)
            cameraPitch: ((window.cameraPitch ?? 5) - 5) / 5, // -1 (look down) to +1 (look up)
            cameraRoll: ((window.cameraRoll ?? 5) - 5) / 5, // -1 (tilt left) to +1 (tilt right)
            cameraYaw: ((window.cameraYaw ?? 5) - 5) / 5, // -1 (turn left) to +1 (turn right)
            colorIntensity: (window.colorIntensity ?? 100) / 100, // Normalize to 0-1 range
            colorPalette,
            colorSaturation: (window.colorSaturation ?? 100) / 100, // Normalize to 0-1 range
            cyberpunkMode,
            fogDensity: (window.fogDensity ?? 100) / 100, // Normalize to 0-1 range
            lightIntensity: (window.lightIntensity ?? 100) / 100, // Normalize to 0-1 range
            neonFlash: (window.neonFlash ?? 5) / 5, // 0 to 2 intensity
            speed: (window.speed ?? 5) / 5, // Normalize to 0-1 range with max = 2
            streetLights: (window.streetLights ?? 5) / 5, // 0 to 2 density
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
            iBuildingFill: { value: 0.2 },
            // Style uniforms
            iBuildingHeight: { value: 1.0 },
            // Movement uniforms
            iCameraPitch: { value: 0.0 },
            iCameraRoll: { value: 0.0 },
            iCameraYaw: { value: 0.0 },
            iColorIntensity: { value: 1.0 },
            iColorPalette: { value: 0 },
            iColorSaturation: { value: 1.0 },
            iCyberpunkMode: { value: 0 },
            iFogDensity: { value: 1.0 },
            iLightIntensity: { value: 1.0 },
            iNeonFlash: { value: 1.0 },
            iSpeed: { value: 1.0 },
            iStreetLights: { value: 1.0 },
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
        this.material.uniforms.iColorPalette.value = controls.colorPalette
        this.material.uniforms.iFogDensity.value = controls.fogDensity
        this.material.uniforms.iLightIntensity.value = controls.lightIntensity
        this.material.uniforms.iColorSaturation.value = controls.colorSaturation
        this.material.uniforms.iColorIntensity.value = controls.colorIntensity
        // Movement uniforms
        this.material.uniforms.iCameraPitch.value = controls.cameraPitch
        this.material.uniforms.iCameraRoll.value = controls.cameraRoll
        this.material.uniforms.iCameraYaw.value = controls.cameraYaw
        // Style uniforms
        this.material.uniforms.iBuildingHeight.value = controls.buildingHeight
        this.material.uniforms.iNeonFlash.value = controls.neonFlash
        this.material.uniforms.iStreetLights.value = controls.streetLights
        this.material.uniforms.iBuildingFill.value = controls.buildingFill
    }
}
