/**
 * Reality.exe — Safer, coherent glitch aesthetic
 * Modes: Mixed, Dialog, BSOD, Loading, Glitch
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
        mode: string | number
        severity: number
        glitch: number
        saturation: number
        brightness: number
        flashLimit: number
        safety: number
    }
}

export interface RealitySafeControls {
    mode: number // 0..4
    severity: number // 0..1
    glitch: number // 0..1
    saturation: number // 0..2
    brightness: number // 0..2
    flashLimit: number // 0..1
    safety: number // 0..1
    motion: number // 0..2
    parallax: number // 0..1
    curvature: number // 0..1
    artifact: number // 0..1
    mixSpeed: number // 0..2
}

@Effect({
    author: 'hyperb1iss',
    description: 'Reality.exe — curated glitch modes with safety damping and coherent visuals',
    name: 'Reality.exe (Safe)',
})
export class RealityExeSafeEffect extends WebGLEffect<RealitySafeControls> {
    private readonly modes = ['Mixed', 'Dialog', 'BSOD', 'Loading', 'Glitch']

    @ComboboxControl({
        default: 'Mixed',
        label: 'Mode',
        tooltip: 'Pick a safer preset',
        values: ['Mixed', 'Dialog', 'BSOD', 'Loading', 'Glitch'],
    })
    mode!: string

    @NumberControl({
        default: 40,
        label: 'Severity',
        max: 100,
        min: 0,
        tooltip: 'Overall intensity of features',
    })
    severity!: number

    @NumberControl({
        default: 35,
        label: 'Glitch',
        max: 100,
        min: 0,
        tooltip: 'Digital glitch amount (gentle)',
    })
    glitch!: number

    @NumberControl({
        default: 120,
        label: 'Saturation',
        max: 200,
        min: 0,
        tooltip: 'Color saturation',
    })
    saturation!: number

    @NumberControl({
        default: 110,
        label: 'Brightness',
        max: 200,
        min: 10,
        tooltip: 'Color brightness',
    })
    brightness!: number

    @NumberControl({
        default: 30,
        label: 'Flash Limit',
        max: 100,
        min: 0,
        tooltip: 'Caps flicker amplitude to reduce flashing',
    })
    flashLimit!: number

    @NumberControl({
        default: 60,
        label: 'Safety Damping',
        max: 100,
        min: 0,
        tooltip: 'Globally damps motion and intensity',
    })
    safety!: number

    @NumberControl({
        default: 80,
        label: 'Motion Amount',
        max: 200,
        min: 0,
        tooltip: 'Envelope speed/amount for subtle camera motion',
    })
    motion!: number

    @NumberControl({
        default: 30,
        label: 'Parallax',
        max: 100,
        min: 0,
        tooltip: 'Camera parallax amount',
    })
    parallax!: number

    @NumberControl({
        default: 20,
        label: 'Curvature',
        max: 100,
        min: 0,
        tooltip: 'CRT-like curvature and aberration',
    })
    curvature!: number

    @NumberControl({
        default: 50,
        label: 'Artifact Density',
        max: 100,
        min: 0,
        tooltip: 'Text/block density in BSOD/artifacts',
    })
    artifact!: number

    @NumberControl({
        default: 80,
        label: 'Mode Mix Speed',
        max: 200,
        min: 0,
        tooltip: 'Speed of blending between sub-elements in Mixed mode',
    })
    mixSpeed!: number

    constructor() {
        super({
            debug: true,
            fragmentShader,
            id: 'reality-exe-error',
            name: 'Reality.exe (Safe)',
        })
    }

    protected initializeControls(): void {
        window.mode = 'Mixed'
        window.severity = 40
        window.glitch = 35
        window.saturation = 120
        window.brightness = 110
        window.flashLimit = 30
        window.safety = 60
        window.motion = 80
        window.parallax = 30
        window.curvature = 20
        window.artifact = 50
        window.mixSpeed = 80
    }

    protected getControlValues(): RealitySafeControls {
        const w = window as unknown as Record<string, unknown>
        const modeIndex = comboboxValueToIndex((w.mode as string | number | undefined) ?? 'Mixed', this.modes, 0)
        return {
            artifact: normalizePercentage((w.artifact as number) ?? 50, 100, 0.0),
            brightness: normalizePercentage((w.brightness as number) ?? 110, 100, 0.1) * 2.0,
            curvature: normalizePercentage((w.curvature as number) ?? 20, 100, 0.0),
            flashLimit: normalizePercentage((w.flashLimit as number) ?? 30, 100, 0.0),
            glitch: normalizePercentage((w.glitch as number) ?? 35, 100, 0.0),
            mixSpeed: normalizePercentage((w.mixSpeed as number) ?? 80, 100, 0.0) * 2.0,
            mode: modeIndex,
            motion: normalizePercentage((w.motion as number) ?? 80, 100, 0.0) * 2.0,
            parallax: normalizePercentage((w.parallax as number) ?? 30, 100, 0.0),
            safety: normalizePercentage((w.safety as number) ?? 60, 100, 0.0),
            saturation: normalizePercentage((w.saturation as number) ?? 120, 100, 0.0) * 2.0,
            severity: normalizePercentage((w.severity as number) ?? 40, 100, 0.0),
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iArtifact: { value: 0.5 },
            iBrightness: { value: 1.1 },
            iCurvature: { value: 0.2 },
            iFlashLimit: { value: 0.3 },
            iGlitch: { value: 0.35 },
            iMixSpeed: { value: 1.6 },
            iMode: { value: 0 },
            iMotion: { value: 1.6 },
            iParallax: { value: 0.3 },
            iSafety: { value: 0.6 },
            iSaturation: { value: 1.2 },
            iSeverity: { value: 0.4 },
        }
    }

    protected updateUniforms(c: RealitySafeControls): void {
        if (!this.material) return
        this.material.uniforms.iMode.value = c.mode
        this.material.uniforms.iSeverity.value = c.severity
        this.material.uniforms.iGlitch.value = c.glitch
        this.material.uniforms.iSaturation.value = c.saturation
        this.material.uniforms.iBrightness.value = c.brightness
        this.material.uniforms.iFlashLimit.value = c.flashLimit
        this.material.uniforms.iSafety.value = c.safety
        this.material.uniforms.iMotion.value = c.motion
        this.material.uniforms.iParallax.value = c.parallax
        this.material.uniforms.iCurvature.value = c.curvature
        this.material.uniforms.iArtifact.value = c.artifact
        this.material.uniforms.iMixSpeed.value = c.mixSpeed
    }
}

const effect = new RealityExeSafeEffect()
initializeEffect(() => effect.initialize())
export default effect
