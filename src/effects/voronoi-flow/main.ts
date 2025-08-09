/**
 * Voronoi Flow — WebGL Effect
 * Cellular rivers with domain-warped motion; high-contrast for RGB matrices
 */

import * as THREE from 'three'
import { initializeEffect } from '../../core'
import { ComboboxControl, Effect, NumberControl } from '../../core/controls/decorators'
import { comboboxValueToIndex, normalizePercentage } from '../../core/controls/helpers'
import { WebGLEffect } from '../../core/effects/webgl-effect'

import fragmentShader from './fragment.glsl'

declare global {
    interface Window {
        scale: number
        speed: number
        ridge: number
        swirl: number
        shimmer: number
        palette: string | number
        saturation: number
        brightness: number
    }
}

export interface VoronoiFlowControls {
    scale: number
    speed: number
    ridge: number
    swirl: number
    shimmer: number
    palette: number
    saturation: number
    brightness: number
}

@Effect({
    author: 'hyperb1iss',
    description: 'Domain-warped Voronoi ridges forming flowing cellular rivers',
    name: 'Voronoi Flow',
})
export class VoronoiFlowEffect extends WebGLEffect<VoronoiFlowControls> {
    private readonly palettes = [
        'Rainbow',
        'Neon',
        'Mono',
        'Ocean',
        'Fire',
        'Aurora',
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
    ]

    @NumberControl({ default: 120, label: 'Scale', max: 400, min: 30, tooltip: 'Cell size' })
    scale!: number

    @NumberControl({ default: 70, label: 'Speed', max: 200, min: 0, tooltip: 'Flow speed' })
    speed!: number

    @NumberControl({ default: 110, label: 'Ridge', max: 200, min: 0, tooltip: 'Ridge sharpness' })
    ridge!: number

    @NumberControl({ default: 80, label: 'Swirl', max: 200, min: 0, tooltip: 'Domain warp amplitude' })
    swirl!: number

    @NumberControl({ default: 60, label: 'Shimmer', max: 200, min: 0, tooltip: 'Edge sparkle amount' })
    shimmer!: number

    @ComboboxControl({
        default: 'Rainbow',
        label: 'Palette',
        tooltip: 'Color palette',
        values: [
            'Rainbow',
            'Neon',
            'Mono',
            'Ocean',
            'Fire',
            'Aurora',
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
        ],
    })
    palette!: string

    @NumberControl({ default: 130, label: 'Saturation', max: 200, min: 0, tooltip: 'Color saturation' })
    saturation!: number

    @NumberControl({ default: 110, label: 'Brightness', max: 200, min: 10, tooltip: 'Brightness' })
    brightness!: number

    constructor() {
        super({ debug: true, fragmentShader, id: 'voronoi-flow', name: 'Voronoi Flow' })
    }

    protected initializeControls(): void {
        window.scale = 120
        window.speed = 70
        window.ridge = 110
        window.swirl = 80
        window.shimmer = 60
        window.palette = 'Rainbow'
        window.saturation = 130
        window.brightness = 110
    }

    protected getControlValues(): VoronoiFlowControls {
        const paletteIndex = comboboxValueToIndex(window.palette ?? 'Rainbow', this.palettes, 0)
        return {
            brightness: normalizePercentage(window.brightness ?? 110, 100, 0.1) * 2.0,
            palette: paletteIndex,
            ridge: normalizePercentage(window.ridge ?? 110, 100, 0.0) * 2.0,
            saturation: normalizePercentage(window.saturation ?? 130, 100, 0.0) * 2.0,
            scale: normalizePercentage(window.scale ?? 120, 100, 0.3) * 4.0,
            shimmer: normalizePercentage(window.shimmer ?? 60, 100, 0.0) * 2.0,
            speed: normalizePercentage(window.speed ?? 70, 100, 0.0) * 2.0,
            swirl: normalizePercentage(window.swirl ?? 80, 100, 0.0) * 2.0,
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iBrightness: { value: 1.1 },
            iPalette: { value: 0 },
            iRidge: { value: 1.1 },
            iSaturation: { value: 1.3 },
            iScale: { value: 1.2 },
            iShimmer: { value: 0.6 },
            iSpeed: { value: 0.7 },
            iSwirl: { value: 0.8 },
        }
    }

    protected updateUniforms(c: VoronoiFlowControls): void {
        if (!this.material) return
        this.material.uniforms.iScale.value = c.scale
        this.material.uniforms.iSpeed.value = c.speed
        this.material.uniforms.iRidge.value = c.ridge
        this.material.uniforms.iSwirl.value = c.swirl
        this.material.uniforms.iShimmer.value = c.shimmer
        this.material.uniforms.iPalette.value = c.palette
        this.material.uniforms.iSaturation.value = c.saturation
        this.material.uniforms.iBrightness.value = c.brightness
    }
}

const effect = new VoronoiFlowEffect()
initializeEffect(() => effect.initialize())
export default effect
