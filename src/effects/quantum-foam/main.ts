/**
 * Quantum Foam — WebGL Effect (Refined)
 * Volumetric ridged-fbm foam, particle pairs, and collapse flashes.
 * Designed to be vivid, performant, and highly controllable.
 */

import {
    BooleanControl,
    boolToInt,
    ComboboxControl,
    comboboxValueToIndex,
    Effect,
    initializeEffect,
    NumberControl,
    normalizePercentage,
    WebGLEffect,
} from '@lightscript/core'
import * as THREE from 'three'

import fragmentShader from './fragment.glsl'

declare global {
    interface Window {
        density: number
        fluctuationSpeed: number
        energy: number
        saturation: number
        foamScale: number
        turbulence: number
        collapseRate: number
        observer: boolean | number
        virtualParticles: boolean | number
        palette: string | number
        paletteMix: number
    }
}

export interface QuantumFoamControls {
    density: number // 0-2
    fluctuationSpeed: number // 0-1
    energy: number // 0-2
    saturation: number // 0-2
    foamScale: number // 0.5-4.0
    turbulence: number // 0-2
    collapseRate: number // 0-1
    observer: boolean
    virtualParticles: boolean
    palette: number
    paletteMix: number
}

@Effect({
    author: 'hyperb1iss',
    description: 'Volumetric quantum foam with collapse flashes and virtual particle pairs',
    name: 'Quantum Foam',
})
export class QuantumFoamEffect extends WebGLEffect<QuantumFoamControls> {
    @NumberControl({
        default: 100,
        label: 'Foam Density',
        max: 200,
        min: 0,
        tooltip: 'Overall foam complexity and depth',
    })
    density!: number

    @NumberControl({
        default: 60,
        label: 'Fluctuation Speed',
        max: 100,
        min: 0,
        tooltip: 'Speed of foam evolution',
    })
    fluctuationSpeed!: number

    @NumberControl({
        default: 120,
        label: 'Energy (Brightness)',
        max: 200,
        min: 10,
        tooltip: 'Brightness/energy of the foam',
    })
    energy!: number

    @NumberControl({
        default: 120,
        label: 'Saturation',
        max: 200,
        min: 0,
        tooltip: 'Color saturation of the foam',
    })
    saturation!: number

    @NumberControl({
        default: 100,
        label: 'Foam Scale',
        max: 400,
        min: 50,
        tooltip: 'Spatial scale of the foam pattern',
    })
    foamScale!: number

    @NumberControl({
        default: 80,
        label: 'Turbulence',
        max: 200,
        min: 0,
        tooltip: 'Warping intensity for flow field',
    })
    turbulence!: number

    @NumberControl({
        default: 30,
        label: 'Collapse Rate',
        max: 100,
        min: 0,
        tooltip: 'Frequency of collapse flashes',
    })
    collapseRate!: number

    @BooleanControl({
        default: false,
        label: 'Observer Effect',
        tooltip: 'Stabilize and sharpen when observed',
    })
    observer!: boolean

    @BooleanControl({
        default: true,
        label: 'Virtual Particles',
        tooltip: 'Enable particle pair pop-in/out',
    })
    virtualParticles!: boolean

    @ComboboxControl({
        default: 'Aurora',
        label: 'Palette',
        tooltip: 'Alternate color schemes for the foam',
        values: [
            'Aurora',
            'Rainbow',
            'Neon',
            'Ocean',
            'Fire',
            'Cyberpunk',
            'Sunset',
            'Mono',
            'Pastel',
            'Forest',
            'Heatmap',
            'Viridis',
            'Inferno',
            'Plasma',
            'Magma',
        ],
    })
    palette!: string

    @NumberControl({
        default: 40,
        label: 'Palette Mix',
        max: 100,
        min: 0,
        tooltip: 'Blend between base physics color and palette',
    })
    paletteMix!: number

    constructor() {
        super({
            debug: true,
            fragmentShader,
            id: 'quantum-foam',
            name: 'Quantum Foam',
        })
    }

    protected initializeControls(): void {
        window.density = 100
        window.fluctuationSpeed = 60
        window.energy = 120
        window.saturation = 120
        window.foamScale = 100
        window.turbulence = 80
        window.collapseRate = 30
        window.observer = 0
        window.virtualParticles = 1
        window.palette = 'Aurora'
        window.paletteMix = 40
    }

    protected getControlValues(): QuantumFoamControls {
        const paletteIndex = comboboxValueToIndex(
            (window.palette as string | number | undefined) ?? 'Aurora',
            [
                'Aurora',
                'Rainbow',
                'Neon',
                'Ocean',
                'Fire',
                'Cyberpunk',
                'Sunset',
                'Mono',
                'Pastel',
                'Forest',
                'Heatmap',
                'Viridis',
                'Inferno',
                'Plasma',
                'Magma',
            ],
            0,
        )
        return {
            collapseRate: normalizePercentage(window.collapseRate ?? 30, 100, 0.0),
            density: normalizePercentage(window.density ?? 100, 100, 0.0) * 2.0,
            energy: normalizePercentage(window.energy ?? 120, 120, 0.1) * 2.0,
            fluctuationSpeed: normalizePercentage(window.fluctuationSpeed ?? 60, 100, 0.0),
            foamScale: normalizePercentage(window.foamScale ?? 100, 100, 0.5) * 4.0,
            observer: Boolean(boolToInt(window.observer ?? 0)),
            palette: paletteIndex,
            paletteMix: normalizePercentage(window.paletteMix ?? 40, 100, 0.0),
            saturation: normalizePercentage(window.saturation ?? 120, 100, 0.0) * 2.0,
            turbulence: normalizePercentage(window.turbulence ?? 80, 100, 0.0) * 2.0,
            virtualParticles: Boolean(boolToInt(window.virtualParticles ?? 1)),
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iCollapseRate: { value: 0.3 },
            iDensity: { value: 1.0 },
            iEnergy: { value: 1.2 },
            iFluctuationSpeed: { value: 0.6 },
            iFoamScale: { value: 1.0 },
            iObserver: { value: 0.0 },
            iPalette: { value: 0 },
            iPaletteMix: { value: 0.4 },
            iSaturation: { value: 1.2 },
            iTurbulence: { value: 0.8 },
            iVirtualParticles: { value: 1.0 },
        }
    }

    protected updateUniforms(c: QuantumFoamControls): void {
        if (!this.material) return
        this.material.uniforms.iDensity.value = c.density
        this.material.uniforms.iFluctuationSpeed.value = c.fluctuationSpeed
        this.material.uniforms.iEnergy.value = c.energy
        this.material.uniforms.iSaturation.value = c.saturation
        this.material.uniforms.iFoamScale.value = c.foamScale
        this.material.uniforms.iTurbulence.value = c.turbulence
        this.material.uniforms.iCollapseRate.value = c.collapseRate
        this.material.uniforms.iObserver.value = c.observer ? 1.0 : 0.0
        this.material.uniforms.iVirtualParticles.value = c.virtualParticles ? 1.0 : 0.0
        this.material.uniforms.iPalette.value = c.palette
        this.material.uniforms.iPaletteMix.value = c.paletteMix
    }
}

const effect = new QuantumFoamEffect()
initializeEffect(() => effect.initialize())
export default effect
