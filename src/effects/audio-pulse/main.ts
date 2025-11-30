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
}

@Effect({
    author: 'hyperb1iss',
    description: 'Audio reactive pulsing rings and spectrum visualizer',
    name: 'Audio Pulse',
})
export class AudioPulseEffect extends WebGLEffect<AudioPulseControls> {
    @NumberControl({
        default: 100,
        label: 'Sensitivity',
        max: 200,
        min: 10,
        tooltip: 'Audio sensitivity multiplier',
    })
    sensitivity!: number

    @NumberControl({
        default: 50,
        label: 'Smoothing',
        max: 95,
        min: 0,
        tooltip: 'Audio smoothing (higher = smoother)',
    })
    smoothing!: number

    @NumberControl({
        default: 150,
        label: 'Bass Boost',
        max: 300,
        min: 0,
        tooltip: 'Bass frequency emphasis',
    })
    bassBoost!: number

    @NumberControl({
        default: 50,
        label: 'Color Speed',
        max: 200,
        min: 0,
        tooltip: 'Color cycling speed',
    })
    colorSpeed!: number

    @NumberControl({
        default: 8,
        label: 'Ring Count',
        max: 16,
        min: 2,
        tooltip: 'Number of frequency rings',
    })
    ringCount!: number

    @NumberControl({
        default: 100,
        label: 'Glow Intensity',
        max: 200,
        min: 0,
        tooltip: 'Glow/bloom effect intensity',
    })
    glowIntensity!: number

    @ComboboxControl({
        default: 'Radial',
        label: 'Visual Style',
        tooltip: 'Visualization style',
        values: ['Radial', 'Bars', 'Wave', 'Circular'],
    })
    visualStyle!: string

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
        window.sensitivity = 100
        window.smoothing = 50
        window.bassBoost = 150
        window.colorSpeed = 50
        window.ringCount = 8
        window.glowIntensity = 100
        window.visualStyle = 'Radial'
    }

    protected getControlValues(): AudioPulseControls {
        const w = window as unknown as Record<string, unknown>
        const styleIndex = comboboxValueToIndex(
            (w.visualStyle as string | number | undefined) ?? 'Radial',
            ['Radial', 'Bars', 'Wave', 'Circular'],
            0,
        )
        return {
            bassBoost: normalizePercentage((w.bassBoost as number) ?? 150, 150, 0.0) * 3.0,
            colorSpeed: normalizePercentage((w.colorSpeed as number) ?? 50, 100, 0.0) * 2.0,
            glowIntensity: normalizePercentage((w.glowIntensity as number) ?? 100, 100, 0.0) * 2.0,
            ringCount: Math.floor((w.ringCount as number) ?? 8),
            sensitivity: normalizePercentage((w.sensitivity as number) ?? 100, 100, 0.1) * 2.0,
            smoothing: normalizePercentage((w.smoothing as number) ?? 50, 95, 0.0),
            visualStyle: styleIndex,
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iBassBoost: { value: 1.5 },
            iColorSpeed: { value: 0.5 },
            iGlowIntensity: { value: 1.0 },
            iRingCount: { value: 8 },
            iSensitivity: { value: 1.0 },
            iSmoothing: { value: 0.5 },
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
        this.material.uniforms.iVisualStyle.value = c.visualStyle
    }
}

const effect = new AudioPulseEffect()
initializeEffect(() => effect.initialize())
export default effect
