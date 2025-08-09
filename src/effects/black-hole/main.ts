/**
 * Black Hole Spaghettification — WebGL Effect
 * Relativistic lensing, accretion disk, photon ring, starfield
 */

import * as THREE from 'three'
import { initializeEffect } from '../../core'
import { ComboboxControl, Effect, NumberControl } from '../../core/controls/decorators'
import { comboboxValueToIndex, normalizePercentage } from '../../core/controls/helpers'
import { WebGLEffect } from '../../core/effects/webgl-effect'

import fragmentShader from './fragment.glsl'

declare global {
    interface Window {
        mass: number
        spin: number
        diskIntensity: number
        diskThickness: number
        lensing: number
        starDensity: number
        relativity: number
        saturation: number
        brightness: number
        palette: string | number
    }
}

export interface BlackHoleControls {
    mass: number
    spin: number
    diskIntensity: number
    diskThickness: number
    lensing: number
    starDensity: number
    relativity: number
    saturation: number
    brightness: number
    highlight: number
    palette: number
}

@Effect({
    author: 'hyperb1iss',
    description: 'Relativistic lensing and accretion disk around a black hole',
    name: 'Black Hole Spaghettification',
})
export class BlackHoleEffect extends WebGLEffect<BlackHoleControls> {
    @NumberControl({ default: 120, label: 'Mass', max: 200, min: 20, tooltip: 'Gravitational strength' })
    mass!: number

    @NumberControl({ default: 60, label: 'Spin', max: 100, min: 0, tooltip: 'Frame dragging (swirl)' })
    spin!: number

    @NumberControl({ default: 130, label: 'Disk Intensity', max: 200, min: 0, tooltip: 'Accretion disk brightness' })
    diskIntensity!: number

    @NumberControl({ default: 50, label: 'Disk Thickness', max: 100, min: 0, tooltip: 'Accretion disk width' })
    diskThickness!: number

    @NumberControl({ default: 100, label: 'Lensing', max: 200, min: 0, tooltip: 'Warp amount' })
    lensing!: number

    @NumberControl({ default: 80, label: 'Star Density', max: 200, min: 0, tooltip: 'Background star density' })
    starDensity!: number

    @NumberControl({ default: 70, label: 'Relativity', max: 100, min: 0, tooltip: 'Relativistic effects strength' })
    relativity!: number

    @NumberControl({ default: 120, label: 'Saturation', max: 200, min: 0, tooltip: 'Color saturation' })
    saturation!: number

    @NumberControl({ default: 110, label: 'Brightness', max: 200, min: 10, tooltip: 'Overall brightness' })
    brightness!: number

    @NumberControl({ default: 35, label: 'Highlights', max: 100, min: 0, tooltip: 'Roll-off for bright highlights' })
    highlight!: number

    @ComboboxControl({
        default: 'Aurora',
        label: 'Palette',
        tooltip: 'Color palette for the disk and grading',
        values: [
            'Aurora',
            'Rainbow',
            'Neon',
            'Ocean',
            'Fire',
            'Cyberpunk',
            'Sunset',
            'Candy',
            'Pastel',
            'Forest',
            'Heatmap',
            'Viridis',
            'Inferno',
            'Plasma',
            'Magma',
            'Mono',
        ],
    })
    palette!: string

    constructor() {
        super({ debug: true, fragmentShader, id: 'black-hole', name: 'Black Hole Spaghettification' })
    }

    protected initializeControls(): void {
        window.mass = 120
        window.spin = 60
        window.diskIntensity = 130
        window.diskThickness = 50
        window.lensing = 100
        window.starDensity = 80
        window.relativity = 70
        window.saturation = 120
        window.brightness = 110
        window.highlight = 35
        window.palette = 'Aurora'
    }

    protected getControlValues(): BlackHoleControls {
        const paletteIndex = comboboxValueToIndex(
            window.palette ?? 'Aurora',
            [
                'Aurora',
                'Rainbow',
                'Neon',
                'Ocean',
                'Fire',
                'Cyberpunk',
                'Sunset',
                'Candy',
                'Pastel',
                'Forest',
                'Heatmap',
                'Viridis',
                'Inferno',
                'Plasma',
                'Magma',
                'Mono',
            ],
            0,
        )
        return {
            brightness: normalizePercentage(window.brightness ?? 110, 100, 0.1) * 2.0,
            diskIntensity: normalizePercentage(window.diskIntensity ?? 130, 100, 0.0) * 2.0,
            diskThickness: normalizePercentage(window.diskThickness ?? 50, 100, 0.0),
            highlight: normalizePercentage(window.highlight ?? 35, 100, 0.0),
            lensing: normalizePercentage(window.lensing ?? 100, 100, 0.0) * 2.0,
            mass: normalizePercentage(window.mass ?? 120, 120, 0.2) * 2.0,
            palette: paletteIndex,
            relativity: normalizePercentage(window.relativity ?? 70, 100, 0.0),
            saturation: normalizePercentage(window.saturation ?? 120, 100, 0.0) * 2.0,
            spin: normalizePercentage(window.spin ?? 60, 100, 0.0),
            starDensity: normalizePercentage(window.starDensity ?? 80, 100, 0.0) * 2.0,
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iBrightness: { value: 1.1 },
            iDiskIntensity: { value: 1.3 },
            iDiskThickness: { value: 0.5 },
            iHighlight: { value: 0.35 },
            iLensing: { value: 1.0 },
            iMass: { value: 1.2 },
            iPalette: { value: 0 },
            iRelativity: { value: 0.7 },
            iSaturation: { value: 1.2 },
            iSpin: { value: 0.6 },
            iStarDensity: { value: 0.8 },
        }
    }

    protected updateUniforms(c: BlackHoleControls): void {
        if (!this.material) return
        this.material.uniforms.iMass.value = c.mass
        this.material.uniforms.iSpin.value = c.spin
        this.material.uniforms.iDiskIntensity.value = c.diskIntensity
        this.material.uniforms.iDiskThickness.value = c.diskThickness
        this.material.uniforms.iLensing.value = c.lensing
        this.material.uniforms.iStarDensity.value = c.starDensity
        this.material.uniforms.iRelativity.value = c.relativity
        this.material.uniforms.iSaturation.value = c.saturation
        this.material.uniforms.iBrightness.value = c.brightness
        this.material.uniforms.iHighlight.value = c.highlight
        this.material.uniforms.iPalette.value = c.palette
    }
}

const effect = new BlackHoleEffect()
initializeEffect(() => effect.initialize())
export default effect
