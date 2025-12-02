/**
 * Iris - Geometric Audio Visualizer
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
        irisStrength: number
        corePulse: number
        flowDrive: number
        colorAccent: number
        colorContrast: number
        bandSharpness: number
        particleDensity: number
        particleSize: number
        particleColorMix: number
        timeSpeed: number
    }
}

export interface IrisControls {
    scale: number
    wanderSpeed: number
    timeSensitivity: number
    bassPull: number
    treblePull: number
    glowIntensity: number
    rotationSpeed: number
    colorScheme: number
    irisStrength: number
    corePulse: number
    flowDrive: number
    colorAccent: number
    colorContrast: number
    bandSharpness: number
    particleDensity: number
    particleSize: number
    particleColorMix: number
    timeSpeed: number
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

function smoothApproach(current: number, target: number, lambda: number, deltaTime: number): number {
    if (!Number.isFinite(lambda) || lambda <= 0) return target
    const factor = 1 - Math.exp(-lambda * Math.max(deltaTime, 0))
    return current + (target - current) * factor
}

function decay(value: number, lambda: number, deltaTime: number): number {
    if (!Number.isFinite(lambda) || lambda <= 0) return value
    return value * Math.exp(-lambda * Math.max(deltaTime, 0))
}

@Effect({
    audioReactive: true,
    author: 'hyperb1iss',
    description: 'Geometric audio visualizer with Möbius inversions and spiral patterns',
    name: 'Iris',
})
export class IrisEffect extends WebGLEffect<IrisControls> {
    private state: WanderState = {
        audioTime: 0,
        beatAccum: 0,
        smoothMouseX: 0,
        smoothMouseY: 0,
        smoothRotation: 0,
        smoothZoom: 1,
    }

    private lastFrameTime = 0

    // ═══════════════════════════════════════════════════════════════
    // STYLE
    // ═══════════════════════════════════════════════════════════════

    @ComboboxControl({
        default: 'Gold & Blue',
        label: 'Colors',
        tooltip: 'Color scheme',
        values: ['Gold & Blue', 'Cyberpunk', 'Aurora', 'Lava', 'Ice', 'Synesthesia', 'Phosphor', 'Vaporwave'],
    })
    colorScheme!: string

    // ═══════════════════════════════════════════════════════════════
    // ANIMATION
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 50,
        label: 'Time Speed',
        max: 100,
        min: 0,
        tooltip: 'Control animation speed',
    })
    timeSpeed!: number

    @NumberControl({
        default: 0,
        label: 'Rotation',
        max: 100,
        min: 0,
        tooltip: 'Pattern rotation speed',
    })
    rotationSpeed!: number

    @NumberControl({
        default: 50,
        label: 'Flow',
        max: 100,
        min: 0,
        tooltip: 'Continuous outward flow strength',
    })
    flowDrive!: number

    // ═══════════════════════════════════════════════════════════════
    // AUDIO
    // ═══════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════
    // PATTERN
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 80,
        label: 'Scale',
        max: 200,
        min: 20,
        tooltip: 'Zoom level',
    })
    scale!: number

    @NumberControl({
        default: 65,
        label: 'Iris',
        max: 100,
        min: 0,
        tooltip: 'Iris/radial pattern strength',
    })
    irisStrength!: number

    @NumberControl({
        default: 60,
        label: 'Core Pulse',
        max: 100,
        min: 0,
        tooltip: 'Energy in the center column',
    })
    corePulse!: number

    @NumberControl({
        default: 50,
        label: 'Bands',
        max: 100,
        min: 0,
        tooltip: 'Sharpen or soften band edges',
    })
    bandSharpness!: number

    // ═══════════════════════════════════════════════════════════════
    // COLOR
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 70,
        label: 'Glow',
        max: 100,
        min: 0,
        tooltip: 'Center glow intensity',
    })
    glowIntensity!: number

    @NumberControl({
        default: 65,
        label: 'Accent',
        max: 100,
        min: 0,
        tooltip: 'Boost palette saturation',
    })
    colorAccent!: number

    @NumberControl({
        default: 60,
        label: 'Contrast',
        max: 100,
        min: 0,
        tooltip: 'Control overall contrast curve',
    })
    colorContrast!: number

    // ═══════════════════════════════════════════════════════════════
    // TEXTURE
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 60,
        label: 'Texture Strength',
        max: 100,
        min: 0,
        tooltip: 'Glitch texture intensity',
    })
    particleDensity!: number

    @NumberControl({
        default: 50,
        label: 'Texture Scale',
        max: 100,
        min: 0,
        tooltip: 'Texture size',
    })
    particleSize!: number

    @NumberControl({
        default: 50,
        label: 'Texture Hue',
        max: 100,
        min: 0,
        tooltip: 'Texture color mixing',
    })
    particleColorMix!: number

    constructor() {
        super({
            audioReactive: true,
            debug: true,
            fragmentShader,
            id: 'iris',
            name: 'Iris',
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
        window.irisStrength = 65
        window.corePulse = 60
        window.flowDrive = 50
        window.colorAccent = 65
        window.colorContrast = 60
        window.bandSharpness = 50
        window.particleDensity = 60
        window.particleSize = 50
        window.particleColorMix = 50
    }

    protected getControlValues(): IrisControls {
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
            'Neon Flux',
            'Midnight Flux',
            'Solar Storm',
        ]

        const scaleFactor = normalizeRange(w.scale as number | undefined, 40, 200, 160)
        const rawWander = normalizePercentage((w.wanderSpeed as number) ?? 30, 100, 0.0)
        const wanderFactor = 0.08 + rawWander * 0.92
        const timeFactor = normalizePercentage((w.timeSensitivity as number) ?? 50, 100, 0.0)
        const bassFactor = normalizePercentage((w.bassPull as number) ?? 60, 100, 0.0)
        const trebleFactor = normalizePercentage((w.treblePull as number) ?? 60, 100, 0.0)
        const glowFactor = normalizePercentage((w.glowIntensity as number) ?? 70, 100, 0.0)
        const rotationFactor = normalizePercentage((w.rotationSpeed as number) ?? 0, 100, 0.0)
        const irisFactor = normalizePercentage((w.irisStrength as number) ?? 65, 100, 0.0)
        const coreFactor = normalizePercentage((w.corePulse as number) ?? 60, 100, 0.0)
        const flowFactor = normalizePercentage((w.flowDrive as number) ?? 50, 100, 0.0)
        const accentFactor = normalizePercentage((w.colorAccent as number) ?? 65, 100, 0.0)
        const contrastFactor = normalizePercentage((w.colorContrast as number) ?? 60, 100, 0.0)
        const bandFactor = normalizePercentage((w.bandSharpness as number) ?? 50, 100, 0.0)
        const particleDensityFactor = normalizePercentage((w.particleDensity as number) ?? 60, 100, 0.0)
        const particleSizeFactor = normalizePercentage((w.particleSize as number) ?? 50, 100, 0.0)
        const particleColorFactor = normalizePercentage((w.particleColorMix as number) ?? 50, 100, 0.0)
        const timeSpeedFactor = normalizePercentage((w.timeSpeed as number) ?? 50, 100, 0.0)

        return {
            bandSharpness: lerp(0.5, 2.0, bandFactor ** 0.8),
            bassPull: lerp(0.0, 2.4, bassFactor ** 1.1),
            colorAccent: lerp(0.6, 1.6, accentFactor ** 0.9),
            colorContrast: lerp(0.7, 2.0, contrastFactor ** 0.8),
            colorScheme: comboboxValueToIndex(
                (w.colorScheme as string | number | undefined) ?? 'Gold & Blue',
                colorSchemes,
                0,
            ),
            corePulse: lerp(0.2, 2.8, coreFactor ** 0.95),
            flowDrive: lerp(0.2, 2.5, flowFactor ** 0.9),
            glowIntensity: lerp(0.12, 1.2, glowFactor),
            irisStrength: lerp(0.3, 3.2, irisFactor ** 0.85),
            particleColorMix: lerp(0.05, 1.2, particleColorFactor ** 0.9),
            particleDensity: lerp(0.05, 3.0, particleDensityFactor ** 0.8),
            particleSize: lerp(0.2, 2.0, particleSizeFactor ** 0.8),
            rotationSpeed: lerp(0.0, 2.4, rotationFactor ** 1.2),
            scale: lerp(2.0, 5.0, scaleFactor ** 0.7),
            timeSensitivity: lerp(0.35, 2.8, timeFactor ** 0.9),
            timeSpeed: lerp(0.3, 2.5, timeSpeedFactor ** 0.8),
            treblePull: lerp(0.0, 2.0, trebleFactor ** 1.05),
            wanderSpeed: lerp(0.15, 2.2, wanderFactor ** 0.9),
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iAudioTime: { value: 0.0 },
            iBandSharpness: { value: 1.0 },
            iBeatRotation: { value: 0.0 },
            iBeatZoom: { value: 1.0 },
            iColorAccent: { value: 1.0 },
            iColorContrast: { value: 1.0 },
            iColorScheme: { value: 0 },
            iCorePulse: { value: 0.6 },
            iFlowDrive: { value: 1.0 },
            iGlowIntensity: { value: 1.0 },
            iIrisStrength: { value: 1.0 },
            iParticleColorMix: { value: 0.5 },
            iParticleDensity: { value: 1.0 },
            iParticleSize: { value: 0.8 },
            iRotationSpeed: { value: 0.0 },
            iScale: { value: 1.6 },
            iSmoothMouse: { value: new THREE.Vector2(0, 0) },
        }
    }

    protected updateUniforms(c: IrisControls): void {
        if (!this.material) return

        const audio = getAudioData()
        const irisAudioBoost = 0.9 + audio.midEnv * 0.6 + audio.beatPulse * 0.4
        const coreAudioBoost = 0.85 + audio.bassEnv * 0.6 + audio.beatPulse * 0.4
        const flowAudioBoost = 0.7 + audio.momentum * 0.4 + audio.levelShort * 0.3
        const flowBeatMod = flowAudioBoost * (0.8 + audio.beatPulse * 0.6)
        const colorAudioAccent = 0.9 + audio.levelShort * 0.3
        const colorAudioContrast = 0.9 + audio.momentum * 0.2
        const bandAudioBoost = 0.8 + audio.beatPulse * 0.4
        const particleAudioDensity = 0.8 + audio.beat * 0.3
        const particleAudioSize = 0.9 + audio.level * 0.2
        const particleAudioColor = 0.8 + audio.treble * 0.4
        const bpm = audio.tempo

        const now = performance.now() / 1000
        const deltaTime = this.lastFrameTime > 0 ? now - this.lastFrameTime : 0.016
        this.lastFrameTime = now
        const safeDelta = Math.min(deltaTime, 0.05)

        const levelBoost = 0.45 + audio.levelShort * 0.9 + audio.beatPulse * 0.6
        const timeWarp = (0.8 + c.timeSensitivity) * c.timeSpeed
        this.state.audioTime += safeDelta * timeWarp * levelBoost

        // Accumulate beat energy for rotation - more responsive
        this.state.beatAccum += audio.beatPulse * (0.35 + c.timeSensitivity * 0.05)
        this.state.beatAccum = Math.max(0, decay(this.state.beatAccum, 2.6, safeDelta))

        // Target rotation: base wander + beat accumulation + momentum sway
        const spinAudio = audio.mid * 0.3 + audio.momentum * 0.4 + audio.beatPulse * 0.35
        const rotationWander = Math.sin(this.state.audioTime * 0.25 + c.rotationSpeed) * 0.35
        const targetRotation = rotationWander + this.state.beatAccum + spinAudio * c.rotationSpeed

        // Target zoom: more pronounced pulse on beats
        const targetZoom = 1.0 + audio.beatPulse * 0.25 + audio.swell * 0.12 + audio.levelShort * 0.12

        // Smooth rotation and zoom - responsive but smooth
        const rotationLambda = 3.2 + audio.beatPulse * 4.5 + Math.abs(audio.momentum) * 2.0
        const zoomLambda = 6 + audio.beatPulse * 6
        this.state.smoothRotation = smoothApproach(this.state.smoothRotation, targetRotation, rotationLambda, safeDelta)
        this.state.smoothZoom = smoothApproach(this.state.smoothZoom, targetZoom, zoomLambda, safeDelta)

        // Wandering path
        const wanderRate = 0.22 + c.wanderSpeed * 0.35 + spinAudio * 0.05
        const wanderAmplitude = 0.2 + c.wanderSpeed * 0.45
        const wanderTime = this.state.audioTime * wanderRate
        const pathX = smoothNoise(wanderTime, 0) * wanderAmplitude
        const pathY = smoothNoise(wanderTime, 123.45) * wanderAmplitude

        // Audio pulls - blend raw + envelope for reactivity with smoothness
        const bassBlend = audio.bass * 0.55 + audio.bassEnv * 0.45 + audio.beat * 0.2
        const trebleBlend = audio.treble * 0.55 + audio.trebleEnv * 0.45 + audio.beat * 0.1

        const wanderNormalized = Math.min(1, c.wanderSpeed / 2.2)
        const audioWanderScale = 0.35 + wanderNormalized * 0.65

        let targetX = pathX + bassBlend * c.bassPull * audioWanderScale
        let targetY = pathY + trebleBlend * c.treblePull * audioWanderScale

        // Pull back toward center as wander decreases
        const focusStrength = 0.25 + (1 - wanderNormalized) * 0.4
        targetX = lerp(targetX, 0, focusStrength)
        targetY = lerp(targetY, 0, focusStrength)

        // Clamp
        const clampRange = 0.6 + wanderNormalized * 0.35
        const clampedX = Math.max(-clampRange, Math.min(clampRange, targetX))
        const clampedY = Math.max(-clampRange, Math.min(clampRange, targetY))

        // Responsive smoothing
        const wanderResponse = 2.2 + audio.beatPulse * 2.4 + c.wanderSpeed * 1.4
        this.state.smoothMouseX = smoothApproach(this.state.smoothMouseX, clampedX, wanderResponse, safeDelta)
        this.state.smoothMouseY = smoothApproach(this.state.smoothMouseY, clampedY, wanderResponse, safeDelta)

        // Update uniforms
        this.material.uniforms.iScale.value = c.scale
        this.material.uniforms.iGlowIntensity.value = c.glowIntensity
        this.material.uniforms.iIrisStrength.value = c.irisStrength * irisAudioBoost
        this.material.uniforms.iCorePulse.value = c.corePulse * coreAudioBoost
        this.material.uniforms.iFlowDrive.value = c.flowDrive * flowBeatMod
        this.material.uniforms.iColorAccent.value = c.colorAccent * colorAudioAccent
        this.material.uniforms.iColorContrast.value = c.colorContrast * colorAudioContrast
        this.material.uniforms.iBandSharpness.value = c.bandSharpness * bandAudioBoost
        this.material.uniforms.iParticleDensity.value = c.particleDensity * particleAudioDensity
        this.material.uniforms.iParticleSize.value = c.particleSize * particleAudioSize
        this.material.uniforms.iParticleColorMix.value = c.particleColorMix * particleAudioColor
        if (this.material.uniforms.iBPM) this.material.uniforms.iBPM.value = bpm / 60
        this.material.uniforms.iRotationSpeed.value = c.rotationSpeed
        this.material.uniforms.iColorScheme.value = c.colorScheme
        this.material.uniforms.iBeatRotation.value = this.state.smoothRotation
        this.material.uniforms.iBeatZoom.value = this.state.smoothZoom
        this.material.uniforms.iSmoothMouse.value.set(this.state.smoothMouseX, this.state.smoothMouseY)
        this.material.uniforms.iAudioTime.value = this.state.audioTime
    }
}

const effect = new IrisEffect()
initializeEffect(() => effect.initialize())
export default effect
