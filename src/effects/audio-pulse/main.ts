/**
 * Audio Pulse — Audio Reactive WebGL Effect
 * Demonstrates audio-reactive uniforms with pulsing radial visualizer
 */

import {
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
        sensitivity: number
        smoothing: number
        bassBoost: number
        colorSpeed: number
        ringCount: number
        glowIntensity: number
        visualStyle: string | number
        colorScheme: string | number
        flow: number
    }
}

export interface AudioPulseControls {
    sensitivity: number
    smoothing: number
    bassBoost: number
    colorSpeed: number
    ringCount: number
    glowIntensity: number
    visualStyle: number
    colorScheme: number
    direction: number
    bend: number
    flow: number
}

@Effect({
    audioReactive: true,
    author: 'hyperb1iss',
    description: 'Cinematic audio visualizer with nebula, spectrum, waves, and kaleidoscope modes',
    name: 'Audio Pulse',
})
export class AudioPulseEffect extends WebGLEffect<AudioPulseControls> {
    @NumberControl({
        default: 50,
        label: 'Sensitivity',
        max: 200,
        min: 10,
        tooltip: 'Audio sensitivity - lower for loud sources',
    })
    sensitivity!: number

    @NumberControl({
        default: 70,
        label: 'Smoothing',
        max: 95,
        min: 0,
        tooltip: 'Motion smoothing (higher = less jitter)',
    })
    smoothing!: number

    @NumberControl({
        default: 80,
        label: 'Bass Boost',
        max: 200,
        min: 0,
        tooltip: 'Bass frequency emphasis',
    })
    bassBoost!: number

    @NumberControl({
        default: 30,
        label: 'Color Speed',
        max: 200,
        min: 0,
        tooltip: 'Color cycling speed',
    })
    colorSpeed!: number

    @NumberControl({
        default: 8,
        label: 'Segments',
        max: 16,
        min: 4,
        tooltip: 'Pattern complexity / bar count',
    })
    ringCount!: number

    @NumberControl({
        default: 80,
        label: 'Glow',
        max: 200,
        min: 0,
        tooltip: 'Bloom and glow intensity',
    })
    glowIntensity!: number

    @NumberControl({
        default: 0,
        label: 'Direction',
        max: 360,
        min: -360,
        tooltip: 'Pulse Field camera yaw offset',
    })
    direction!: number

    @NumberControl({
        default: 0,
        label: 'Bend',
        max: 200,
        min: -200,
        tooltip: 'Pulse Field lattice bend strength',
    })
    bend!: number

    @NumberControl({
        default: 30,
        label: 'Flow',
        max: 100,
        min: -100,
        tooltip: 'Negative = inward pull, positive = outward burst',
    })
    flow!: number

    @ComboboxControl({
        default: 'Pulse Field',
        label: 'Style',
        tooltip: 'Visualization style',
        values: ['Pulse Field', 'Grid', 'Waveform', 'Vortex'],
    })
    visualStyle!: string

    @ComboboxControl({
        default: 'Cyberpunk',
        label: 'Colors',
        tooltip: 'Color scheme preset',
        values: ['Cyberpunk', 'Lava', 'Aurora', 'Vaporwave', 'Toxic', 'Prism'],
    })
    colorScheme!: string

    constructor() {
        super({
            audioReactive: true, // Enable audio uniforms
            debug: true,
            fragmentShader,
            id: 'audio-pulse',
            name: 'Audio Pulse',
        })
    }

    protected initializeControls(): void {
        window.sensitivity = 50
        window.smoothing = 70
        window.bassBoost = 80
        window.colorSpeed = 30
        window.ringCount = 8
        window.glowIntensity = 80
        window.direction = 0
        window.bend = 0
        window.flow = 30
        window.visualStyle = 'Pulse Field'
        window.colorScheme = 'Cyberpunk'
    }

    protected getControlValues(): AudioPulseControls {
        const w = window as unknown as Record<string, unknown>
        const styleIndex = comboboxValueToIndex(
            (w.visualStyle as string | number | undefined) ?? 'Pulse Field',
            ['Pulse Field', 'Grid', 'Waveform', 'Vortex'],
            0,
        )
        const schemeIndex = comboboxValueToIndex(
            (w.colorScheme as string | number | undefined) ?? 'Cyberpunk',
            ['Cyberpunk', 'Lava', 'Aurora', 'Vaporwave', 'Toxic', 'Prism'],
            0,
        )
        const glowFactor = normalizePercentage((w.glowIntensity as number) ?? 80, 100, 0.0)
        const glowNormalized = Math.min(Math.max(glowFactor * 0.25, 0), 1)
        const direction = ((w.direction as number) ?? 0) / 180
        const bend = ((w.bend as number) ?? 0) / 100
        const flow = Math.max(-1, Math.min(((w.flow as number) ?? 30) / 100, 1))

        return {
            bassBoost: normalizePercentage((w.bassBoost as number) ?? 80, 100, 0.0) * 2.0,
            bend,
            colorScheme: schemeIndex,
            colorSpeed: normalizePercentage((w.colorSpeed as number) ?? 30, 100, 0.0) * 2.0,
            direction,
            flow,
            glowIntensity: glowNormalized,
            ringCount: Math.floor((w.ringCount as number) ?? 8),
            sensitivity: normalizePercentage((w.sensitivity as number) ?? 50, 100, 0.1) * 1.5,
            smoothing: normalizePercentage((w.smoothing as number) ?? 70, 95, 0.0),
            visualStyle: styleIndex,
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iBassBoost: { value: 1.6 },
            iBend: { value: 0 },
            iColorScheme: { value: 0 },
            iColorSpeed: { value: 0.6 },
            iDirection: { value: 0 },
            iFlow: { value: 0.3 },
            iGlowIntensity: { value: 0.4 },
            iRingCount: { value: 8 },
            iSensitivity: { value: 0.75 },
            iSmoothing: { value: 0.74 },
            iVisualStyle: { value: 0 },
        }
    }

    protected updateUniforms(c: AudioPulseControls): void {
        if (!this.material) return
        this.material.uniforms.iSensitivity.value = c.sensitivity
        this.material.uniforms.iSmoothing.value = c.smoothing
        this.material.uniforms.iBassBoost.value = c.bassBoost
        this.material.uniforms.iColorSpeed.value = c.colorSpeed
        this.material.uniforms.iRingCount.value = c.ringCount
        this.material.uniforms.iGlowIntensity.value = c.glowIntensity
        this.material.uniforms.iDirection.value = c.direction
        this.material.uniforms.iBend.value = c.bend
        this.material.uniforms.iFlow.value = c.flow
        this.material.uniforms.iVisualStyle.value = c.visualStyle
        this.material.uniforms.iColorScheme.value = c.colorScheme
    }
}

const effect = new AudioPulseEffect()
initializeEffect(() => effect.initialize())
export default effect
