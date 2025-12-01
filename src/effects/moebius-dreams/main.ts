/**
 * Moebius Dreams - Geometric Audio Visualizer
 *
 * A mesmerizing visualization featuring Möbius circle inversions,
 * spiral dot patterns, and audio-reactive geometric waves.
 */

import {
    ComboboxControl,
    comboboxValueToIndex,
    Effect,
    getAudioData,
    initializeEffect,
    NumberControl,
    normalizePercentage,
    WebGLEffect,
} from '@lightscript/core'
import * as THREE from 'three'

import fragmentShader from './fragment.glsl'

declare global {
    interface Window {
        scale: number
        wanderSpeed: number
        timeSensitivity: number
        bassPull: number
        treblePull: number
        glowIntensity: number
        rotationSpeed: number
        colorScheme: string | number
    }
}

export interface MoebiusDreamsControls {
    scale: number
    wanderSpeed: number
    timeSensitivity: number
    bassPull: number
    treblePull: number
    glowIntensity: number
    rotationSpeed: number
    colorScheme: number
}

interface WanderState {
    smoothMouseX: number
    smoothMouseY: number
    audioTime: number
    smoothRotation: number
    smoothZoom: number
    beatAccum: number
}

function hashNoise(x: number, seed: number): number {
    const n = Math.sin(x * 127.1 + seed * 311.7) * 43758.5453
    return (n - Math.floor(n)) * 2.0 - 1.0
}

function smoothNoise(x: number, seed: number): number {
    const i = Math.floor(x)
    const f = x - i
    const smooth = f * f * (3.0 - 2.0 * f)
    return hashNoise(i, seed) * (1.0 - smooth) + hashNoise(i + 1, seed) * smooth
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

function normalizeRange(value: number | undefined, min: number, max: number, defaultValue: number): number {
    const safeValue = typeof value === 'number' && !Number.isNaN(value) ? value : defaultValue
    const clamped = Math.min(Math.max(safeValue, min), max)
    const span = Math.max(0.00001, max - min)
    return (clamped - min) / span
}

@Effect({
    audioReactive: true,
    author: 'hyperb1iss',
    description: 'Geometric audio visualizer with Möbius inversions and spiral patterns',
    name: 'Moebius Dreams',
})
export class MoebiusDreamsEffect extends WebGLEffect<MoebiusDreamsControls> {
    private state: WanderState = {
        audioTime: 0,
        beatAccum: 0,
        smoothMouseX: 0,
        smoothMouseY: 0,
        smoothRotation: 0,
        smoothZoom: 1,
    }

    private lastFrameTime = 0

    @NumberControl({
        default: 80,
        label: 'Scale',
        max: 200,
        min: 20,
        tooltip: 'Zoom level',
    })
    scale!: number

    @NumberControl({
        default: 30,
        label: 'Wander',
        max: 100,
        min: 0,
        tooltip: 'View wandering with audio',
    })
    wanderSpeed!: number

    @NumberControl({
        default: 50,
        label: 'Time Warp',
        max: 100,
        min: 0,
        tooltip: 'Audio influence on speed',
    })
    timeSensitivity!: number

    @NumberControl({
        default: 60,
        label: 'Bass Pull',
        max: 100,
        min: 0,
        tooltip: 'Bass influence on movement',
    })
    bassPull!: number

    @NumberControl({
        default: 60,
        label: 'Treble Pull',
        max: 100,
        min: 0,
        tooltip: 'Treble influence on movement',
    })
    treblePull!: number

    @NumberControl({
        default: 70,
        label: 'Glow',
        max: 100,
        min: 0,
        tooltip: 'Center glow intensity',
    })
    glowIntensity!: number

    @NumberControl({
        default: 0,
        label: 'Rotation',
        max: 100,
        min: 0,
        tooltip: 'Pattern rotation speed',
    })
    rotationSpeed!: number

    @ComboboxControl({
        default: 'Gold & Blue',
        label: 'Colors',
        tooltip: 'Color scheme',
        values: ['Gold & Blue', 'Cyberpunk', 'Aurora', 'Lava', 'Ice', 'Synesthesia', 'Phosphor', 'Vaporwave'],
    })
    colorScheme!: string

    constructor() {
        super({
            audioReactive: true,
            debug: true,
            fragmentShader,
            id: 'moebius-dreams',
            name: 'Moebius Dreams',
        })
    }

    protected initializeControls(): void {
        window.scale = 80
        window.wanderSpeed = 30
        window.timeSensitivity = 50
        window.bassPull = 60
        window.treblePull = 60
        window.glowIntensity = 70
        window.rotationSpeed = 0
        window.colorScheme = 'Gold & Blue'
    }

    protected getControlValues(): MoebiusDreamsControls {
        const w = window as unknown as Record<string, unknown>

        const colorSchemes = [
            'Gold & Blue',
            'Cyberpunk',
            'Aurora',
            'Lava',
            'Ice',
            'Synesthesia',
            'Phosphor',
            'Vaporwave',
        ]

        const scaleFactor = normalizeRange(w.scale as number | undefined, 20, 200, 80)
        const wanderFactor = normalizePercentage((w.wanderSpeed as number) ?? 30, 100, 0.0)
        const timeFactor = normalizePercentage((w.timeSensitivity as number) ?? 50, 100, 0.0)
        const bassFactor = normalizePercentage((w.bassPull as number) ?? 60, 100, 0.0)
        const trebleFactor = normalizePercentage((w.treblePull as number) ?? 60, 100, 0.0)
        const glowFactor = normalizePercentage((w.glowIntensity as number) ?? 70, 100, 0.0)
        const rotationFactor = normalizePercentage((w.rotationSpeed as number) ?? 0, 100, 0.0)

        return {
            bassPull: lerp(0.0, 2.4, bassFactor ** 1.1),
            colorScheme: comboboxValueToIndex(
                (w.colorScheme as string | number | undefined) ?? 'Gold & Blue',
                colorSchemes,
                0,
            ),
            glowIntensity: lerp(0.12, 1.2, glowFactor),
            rotationSpeed: lerp(0.0, 2.4, rotationFactor ** 1.2),
            scale: lerp(0.55, 3.8, scaleFactor),
            timeSensitivity: lerp(0.35, 2.8, timeFactor ** 0.9),
            treblePull: lerp(0.0, 2.0, trebleFactor ** 1.05),
            wanderSpeed: lerp(0.15, 2.2, wanderFactor ** 0.9),
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iAudioTime: { value: 0.0 },
            iBeatRotation: { value: 0.0 },
            iBeatZoom: { value: 1.0 },
            iColorScheme: { value: 0 },
            iGlowIntensity: { value: 1.0 },
            iRotationSpeed: { value: 0.0 },
            iScale: { value: 1.6 },
            iSmoothMouse: { value: new THREE.Vector2(0, 0) },
        }
    }

    protected updateUniforms(c: MoebiusDreamsControls): void {
        if (!this.material) return

        const audio = getAudioData()

        const now = performance.now() / 1000
        const deltaTime = this.lastFrameTime > 0 ? now - this.lastFrameTime : 0.016
        this.lastFrameTime = now

        const levelBoost = 0.45 + audio.levelShort * 0.9 + audio.beatPulse * 0.6
        const timeWarp = 0.8 + c.timeSensitivity
        this.state.audioTime += deltaTime * timeWarp * levelBoost

        // Accumulate beat energy for rotation - more responsive
        this.state.beatAccum += audio.beatPulse * (0.35 + c.timeSensitivity * 0.05)
        this.state.beatAccum = Math.max(0, this.state.beatAccum * 0.94)

        // Target rotation: base wander + beat accumulation + momentum sway
        const rotationWander = Math.sin(this.state.audioTime * 0.35) * 0.35
        const momentumSway = audio.momentum * 0.35
        const bassRock = audio.bassEnv * 0.2
        const targetRotation = rotationWander + this.state.beatAccum + momentumSway + bassRock

        // Target zoom: more pronounced pulse on beats
        const targetZoom = 1.0 + audio.beatPulse * 0.25 + audio.swell * 0.12 + audio.levelShort * 0.1

        // Smooth rotation and zoom - responsive but smooth
        this.state.smoothRotation += (targetRotation - this.state.smoothRotation) * 0.18
        this.state.smoothZoom += (targetZoom - this.state.smoothZoom) * 0.25

        // Wandering path
        const wanderRate = 0.3 + c.wanderSpeed * 0.6
        const wanderAmplitude = 0.25 + c.wanderSpeed * 0.65
        const wanderTime = this.state.audioTime * wanderRate
        const pathX = smoothNoise(wanderTime, 0) * wanderAmplitude
        const pathY = smoothNoise(wanderTime, 123.45) * wanderAmplitude

        // Audio pulls - blend raw + envelope for reactivity with smoothness
        const bassBlend = audio.bass * 0.55 + audio.bassEnv * 0.45 + audio.beat * 0.2
        const trebleBlend = audio.treble * 0.55 + audio.trebleEnv * 0.45 + audio.beat * 0.1

        const targetX = pathX + bassBlend * c.bassPull
        const targetY = pathY + trebleBlend * c.treblePull

        // Clamp
        const clampRange = 1.3
        const clampedX = Math.max(-clampRange, Math.min(clampRange, targetX))
        const clampedY = Math.max(-clampRange, Math.min(clampRange, targetY))

        // Responsive smoothing
        const lerpFactor = 0.18 + audio.beatPulse * 0.15
        this.state.smoothMouseX += (clampedX - this.state.smoothMouseX) * lerpFactor
        this.state.smoothMouseY += (clampedY - this.state.smoothMouseY) * lerpFactor

        // Update uniforms
        this.material.uniforms.iScale.value = c.scale
        this.material.uniforms.iGlowIntensity.value = c.glowIntensity
        this.material.uniforms.iRotationSpeed.value = c.rotationSpeed
        this.material.uniforms.iColorScheme.value = c.colorScheme
        this.material.uniforms.iBeatRotation.value = this.state.smoothRotation
        this.material.uniforms.iBeatZoom.value = this.state.smoothZoom
        this.material.uniforms.iSmoothMouse.value.set(this.state.smoothMouseX, this.state.smoothMouseY)
        this.material.uniforms.iAudioTime.value = this.state.audioTime
    }
}

const effect = new MoebiusDreamsEffect()
initializeEffect(() => effect.initialize())
export default effect
