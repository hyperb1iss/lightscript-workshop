/**
 * ADHD Hyperfocus — WebGL Effect
 * Tunnel-vision center clarity, peripheral fade, dopamine sparks, paralysis slider.
 */

import * as THREE from 'three'
import { initializeEffect } from '../../core'
import { ComboboxControl, Effect, NumberControl } from '../../core/controls/decorators'
import { comboboxValueToIndex, normalizePercentage } from '../../core/controls/helpers'
import { WebGLEffect } from '../../core/effects/webgl-effect'

import fragmentShader from './fragment.glsl'

declare global {
    interface Window {
        focusRadius: number
        focusStrength: number
        peripheralBlur: number
        saturation: number
        energy: number
        sparkDensity: number
        tunnelSpeed: number
        paralysis: number
        noise: number
        colorMode: string | number
    }
}

export interface ADHDHyperfocusControls {
    focusRadius: number // 0-1
    focusStrength: number // 0-2
    peripheralBlur: number // 0-2
    saturation: number // 0-2
    energy: number // 0-2
    sparkDensity: number // 0-2
    tunnelSpeed: number // 0-2
    paralysis: number // 0-1
    noise: number // 0-2
    colorMode: number // 0..2
}

@Effect({
    author: 'hyperb1iss',
    description: 'Tunnel vision with hyperfocused center and dopamine sparks. Peripheral fade, paralysis control.',
    name: 'ADHD Hyperfocus',
})
export class ADHDHyperfocusEffect extends WebGLEffect<ADHDHyperfocusControls> {
    private readonly colorModes = ['Dopamine', 'Neon', 'Mono']

    @NumberControl({
        default: 28,
        label: 'Focus Radius',
        max: 100,
        min: 5,
        tooltip: 'Radius of the sharp center region',
    })
    focusRadius!: number

    @NumberControl({
        default: 120,
        label: 'Focus Strength',
        max: 200,
        min: 0,
        tooltip: 'Center boost/magnification',
    })
    focusStrength!: number

    @NumberControl({
        default: 60,
        label: 'Peripheral Blur',
        max: 200,
        min: 0,
        tooltip: 'How much the periphery fades/softens',
    })
    peripheralBlur!: number

    @NumberControl({
        default: 120,
        label: 'Saturation',
        max: 200,
        min: 0,
        tooltip: 'Color saturation',
    })
    saturation!: number

    @NumberControl({
        default: 120,
        label: 'Energy (Brightness)',
        max: 200,
        min: 10,
        tooltip: 'Brightness/energy of the effect',
    })
    energy!: number

    @NumberControl({
        default: 80,
        label: 'Spark Density',
        max: 200,
        min: 0,
        tooltip: 'Amount of dopamine sparks',
    })
    sparkDensity!: number

    @NumberControl({
        default: 70,
        label: 'Tunnel Speed',
        max: 200,
        min: 0,
        tooltip: 'Motion speed of the tunnel rings',
    })
    tunnelSpeed!: number

    @NumberControl({
        default: 25,
        label: 'Paralysis',
        max: 100,
        min: 0,
        tooltip: 'Executive dysfunction; reduces motion and spark speed',
    })
    paralysis!: number

    @NumberControl({
        default: 40,
        label: 'Noise',
        max: 200,
        min: 0,
        tooltip: 'Film/noise amount, stronger in periphery',
    })
    noise!: number

    @ComboboxControl({
        default: 'Dopamine',
        label: 'Color Mode',
        tooltip: 'Dopamine (warm/cool), Neon, or Mono',
        values: ['Dopamine', 'Neon', 'Mono'],
    })
    colorMode!: string

    constructor() {
        super({
            debug: true,
            fragmentShader,
            id: 'adhd-hyperfocus',
            name: 'ADHD Hyperfocus',
        })
    }

    protected initializeControls(): void {
        window.focusRadius = 28
        window.focusStrength = 120
        window.peripheralBlur = 60
        window.saturation = 120
        window.energy = 120
        window.sparkDensity = 80
        window.tunnelSpeed = 70
        window.paralysis = 25
        window.noise = 40
        window.colorMode = 'Dopamine'
    }

    protected getControlValues(): ADHDHyperfocusControls {
        const colorModeIndex = comboboxValueToIndex(window.colorMode ?? 'Dopamine', this.colorModes, 0)
        return {
            colorMode: colorModeIndex,
            energy: normalizePercentage(window.energy ?? 120, 120, 0.1) * 2.0,
            focusRadius: normalizePercentage(window.focusRadius ?? 28, 100, 0.05),
            focusStrength: normalizePercentage(window.focusStrength ?? 120, 100, 0.0) * 2.0,
            noise: normalizePercentage(window.noise ?? 40, 100, 0.0) * 2.0,
            paralysis: normalizePercentage(window.paralysis ?? 25, 100, 0.0),
            peripheralBlur: normalizePercentage(window.peripheralBlur ?? 60, 100, 0.0) * 2.0,
            saturation: normalizePercentage(window.saturation ?? 120, 100, 0.0) * 2.0,
            sparkDensity: normalizePercentage(window.sparkDensity ?? 80, 100, 0.0) * 2.0,
            tunnelSpeed: normalizePercentage(window.tunnelSpeed ?? 70, 100, 0.0) * 2.0,
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iColorMode: { value: 0 },
            iEnergy: { value: 1.2 },
            iFocusRadius: { value: 0.28 },
            iFocusStrength: { value: 1.2 },
            iNoise: { value: 0.8 },
            iParalysis: { value: 0.25 },
            iPeripheralBlur: { value: 1.2 },
            iSaturation: { value: 1.2 },
            iSparkDensity: { value: 1.0 },
            iTunnelSpeed: { value: 1.0 },
        }
    }

    protected updateUniforms(c: ADHDHyperfocusControls): void {
        if (!this.material) return
        this.material.uniforms.iFocusRadius.value = c.focusRadius
        this.material.uniforms.iFocusStrength.value = c.focusStrength
        this.material.uniforms.iPeripheralBlur.value = c.peripheralBlur
        this.material.uniforms.iSaturation.value = c.saturation
        this.material.uniforms.iEnergy.value = c.energy
        this.material.uniforms.iSparkDensity.value = c.sparkDensity
        this.material.uniforms.iTunnelSpeed.value = c.tunnelSpeed
        this.material.uniforms.iParalysis.value = c.paralysis
        this.material.uniforms.iNoise.value = c.noise
        this.material.uniforms.iColorMode.value = c.colorMode
    }
}

const effect = new ADHDHyperfocusEffect()
initializeEffect(() => effect.initialize())
export default effect
