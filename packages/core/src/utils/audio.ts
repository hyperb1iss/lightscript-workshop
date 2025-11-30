/**
 * Audio & Screen Reactive Utilities
 *
 * Helper functions for working with SignalRGB's audio and screen APIs.
 * These utilities handle data normalization, frequency analysis, and
 * WebGL uniform creation for audio-reactive effects.
 */

import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Normalized audio data for effect use
 */
export interface AudioData {
    /** Normalized level (0-1, where 1 is loudest) */
    level: number
    /** Raw level in dB (-100 to 0) */
    levelRaw: number
    /** Tone density (0-1, 0=pure tone, 1=white noise) */
    density: number
    /** Stereo width (0-1) */
    width: number
    /** Raw FFT frequency data (200 elements) */
    frequencyRaw: Int8Array
    /** Normalized frequency data (200 elements, 0-1) */
    frequency: Float32Array
    /** Bass level (0-1) - low frequencies */
    bass: number
    /** Mid level (0-1) - mid frequencies */
    mid: number
    /** Treble level (0-1) - high frequencies */
    treble: number
}

/**
 * Screen zone data from SignalRGB's 28x20 grid
 */
export interface ScreenZoneData {
    /** Hue values (0-360) for 560 sample points */
    hue: Float32Array
    /** Saturation values (0-1) for 560 sample points */
    saturation: Float32Array
    /** Lightness values (0-1) for 560 sample points */
    lightness: Float32Array
    /** Grid dimensions */
    width: 28
    height: 20
}

// ─────────────────────────────────────────────────────────────
// Frequency Band Ranges (indices into 200-element FFT array)
// ─────────────────────────────────────────────────────────────

/** Bass frequency range (sub-bass to bass, ~20-250Hz) */
const BASS_RANGE = { end: 10, start: 0 }
/** Mid frequency range (~250Hz-4kHz) */
const MID_RANGE = { end: 80, start: 10 }
/** Treble frequency range (~4kHz-20kHz) */
const TREBLE_RANGE = { end: 200, start: 80 }

// ─────────────────────────────────────────────────────────────
// Audio Data Access
// ─────────────────────────────────────────────────────────────

/**
 * Get normalized audio data from SignalRGB
 *
 * @returns Normalized audio data with frequency bands and levels
 *
 * @example
 * ```typescript
 * const audio = getAudioData()
 * console.log(audio.level) // 0-1 normalized level
 * console.log(audio.bass)  // 0-1 bass intensity
 * ```
 */
export function getAudioData(): AudioData {
    // Handle case where engine isn't available (dev mode)
    const hasEngine = typeof engine !== 'undefined' && engine?.audio

    if (!hasEngine) {
        // Return silent/empty data for development
        return {
            bass: 0,
            density: 0,
            frequency: new Float32Array(200),
            frequencyRaw: new Int8Array(200),
            level: 0,
            levelRaw: -100,
            mid: 0,
            treble: 0,
            width: 0.5,
        }
    }

    const levelRaw = engine.audio.level
    const frequencyRaw = new Int8Array(engine.audio.freq)
    const frequency = new Float32Array(200)

    // Normalize frequency data (handle negative values, scale to 0-1)
    let max = 1
    let min = 0
    for (let i = 0; i < frequencyRaw.length; i++) {
        const val = Math.abs(frequencyRaw[i])
        if (val > max) max = val
        if (val < min) min = val
    }

    for (let i = 0; i < frequencyRaw.length; i++) {
        frequency[i] = (Math.abs(frequencyRaw[i]) - min) / (max - min || 1)
    }

    return {
        bass: getFrequencyRange(frequency, BASS_RANGE.start, BASS_RANGE.end),
        density: engine.audio.density,
        frequency,
        frequencyRaw,
        level: normalizeAudioLevel(levelRaw),
        levelRaw,
        mid: getFrequencyRange(frequency, MID_RANGE.start, MID_RANGE.end),
        treble: getFrequencyRange(frequency, TREBLE_RANGE.start, TREBLE_RANGE.end),
        width: engine.audio.width,
    }
}

/**
 * Get screen zone color data from SignalRGB
 *
 * @returns Screen zone data with HSL values for 560 sample points
 */
export function getScreenZoneData(): ScreenZoneData {
    const hasEngine = typeof engine !== 'undefined' && engine?.zone

    if (!hasEngine) {
        return {
            height: 20,
            hue: new Float32Array(560),
            lightness: new Float32Array(560),
            saturation: new Float32Array(560),
            width: 28,
        }
    }

    const hue = new Float32Array(engine.zone.hue)
    const saturation = new Float32Array(560)
    const lightness = new Float32Array(560)

    // Normalize saturation and lightness from 0-100 to 0-1
    for (let i = 0; i < 560; i++) {
        saturation[i] = (engine.zone.saturation[i] ?? 0) / 100
        lightness[i] = (engine.zone.lightness[i] ?? 0) / 100
    }

    return {
        height: 20,
        hue,
        lightness,
        saturation,
        width: 28,
    }
}

// ─────────────────────────────────────────────────────────────
// Audio Normalization Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize audio level from dB (-100 to 0) to 0-1 range
 *
 * @param levelDb - Raw level in decibels (-100 to 0)
 * @returns Normalized level (0-1)
 */
export function normalizeAudioLevel(levelDb: number): number {
    // -100 dB = 0, 0 dB = 1
    return Math.max(0, Math.min(1, (levelDb + 100) / 100))
}

/**
 * Normalize a single frequency bin value
 *
 * @param value - Raw frequency value (can be negative)
 * @param max - Maximum expected value for scaling
 * @returns Normalized value (0-1)
 */
export function normalizeFrequencyBin(value: number, max = 128): number {
    return Math.max(0, Math.min(1, Math.abs(value) / max))
}

/**
 * Get average level for a frequency range
 *
 * @param frequency - Normalized frequency array
 * @param start - Start index
 * @param end - End index
 * @returns Average level for the range (0-1)
 */
export function getFrequencyRange(frequency: Float32Array, start: number, end: number): number {
    if (end <= start || frequency.length === 0) return 0

    let sum = 0
    const count = Math.min(end, frequency.length) - start
    for (let i = start; i < Math.min(end, frequency.length); i++) {
        sum += frequency[i]
    }
    return count > 0 ? sum / count : 0
}

/**
 * Get bass level (low frequencies)
 * @param frequency - Normalized frequency array
 */
export function getBassLevel(frequency: Float32Array): number {
    return getFrequencyRange(frequency, BASS_RANGE.start, BASS_RANGE.end)
}

/**
 * Get mid level (mid frequencies)
 * @param frequency - Normalized frequency array
 */
export function getMidLevel(frequency: Float32Array): number {
    return getFrequencyRange(frequency, MID_RANGE.start, MID_RANGE.end)
}

/**
 * Get treble level (high frequencies)
 * @param frequency - Normalized frequency array
 */
export function getTrebleLevel(frequency: Float32Array): number {
    return getFrequencyRange(frequency, TREBLE_RANGE.start, TREBLE_RANGE.end)
}

// ─────────────────────────────────────────────────────────────
// Smoothing & Processing
// ─────────────────────────────────────────────────────────────

/**
 * Smooth a value over time using exponential moving average
 *
 * @param currentValue - Current raw value
 * @param previousValue - Previous smoothed value
 * @param smoothing - Smoothing factor (0-1, higher = smoother)
 * @returns Smoothed value
 *
 * @example
 * ```typescript
 * let smoothedBass = 0
 * // In animation loop:
 * smoothedBass = smoothValue(audio.bass, smoothedBass, 0.8)
 * ```
 */
export function smoothValue(currentValue: number, previousValue: number, smoothing = 0.5): number {
    return previousValue * smoothing + currentValue * (1 - smoothing)
}

// ─────────────────────────────────────────────────────────────
// WebGL Uniforms
// ─────────────────────────────────────────────────────────────

/**
 * Create Three.js uniforms for audio-reactive effects
 *
 * @returns Object containing audio uniforms for shaders
 *
 * @example
 * ```typescript
 * // In createUniforms():
 * return {
 *   ...createAudioUniforms(),
 *   iSpeed: { value: 1.0 },
 * }
 * ```
 */
export function createAudioUniforms(): Record<string, THREE.IUniform> {
    return {
        /** Bass frequency level (0-1) */
        iAudioBass: { value: 0.0 },
        /** Tone density (0-1) */
        iAudioDensity: { value: 0.0 },
        /** Overall audio level (0-1) */
        iAudioLevel: { value: 0.0 },
        /** Audio level in dB (-100 to 0) */
        iAudioLevelRaw: { value: -100.0 },
        /** Mid frequency level (0-1) */
        iAudioMid: { value: 0.0 },
        /** Full frequency spectrum (200 elements, sampled to texture) */
        iAudioSpectrum: {
            value: new THREE.DataTexture(
                new Uint8Array(256 * 4), // 256 wide for power-of-2, RGBA
                256,
                1,
                THREE.RGBAFormat,
                THREE.UnsignedByteType,
            ),
        },
        /** Treble frequency level (0-1) */
        iAudioTreble: { value: 0.0 },
        /** Stereo width (0-1) */
        iAudioWidth: { value: 0.5 },
    }
}

/**
 * Update audio uniforms with current data
 *
 * @param uniforms - The uniforms object from createAudioUniforms()
 * @param audio - Current audio data from getAudioData()
 */
export function updateAudioUniforms(uniforms: Record<string, THREE.IUniform>, audio: AudioData): void {
    if (uniforms.iAudioLevel) uniforms.iAudioLevel.value = audio.level
    if (uniforms.iAudioLevelRaw) uniforms.iAudioLevelRaw.value = audio.levelRaw
    if (uniforms.iAudioDensity) uniforms.iAudioDensity.value = audio.density
    if (uniforms.iAudioWidth) uniforms.iAudioWidth.value = audio.width
    if (uniforms.iAudioBass) uniforms.iAudioBass.value = audio.bass
    if (uniforms.iAudioMid) uniforms.iAudioMid.value = audio.mid
    if (uniforms.iAudioTreble) uniforms.iAudioTreble.value = audio.treble

    // Update spectrum texture
    if (uniforms.iAudioSpectrum?.value instanceof THREE.DataTexture) {
        const texture = uniforms.iAudioSpectrum.value
        const data = texture.image.data as Uint8Array

        // Pack frequency data into RGBA texture (200 values → 256 slots)
        for (let i = 0; i < 200; i++) {
            const idx = i * 4
            const val = Math.floor(audio.frequency[i] * 255)
            data[idx] = val // R
            data[idx + 1] = val // G
            data[idx + 2] = val // B
            data[idx + 3] = 255 // A
        }
        // Fill remaining slots with zeros
        for (let i = 200; i < 256; i++) {
            const idx = i * 4
            data[idx] = 0
            data[idx + 1] = 0
            data[idx + 2] = 0
            data[idx + 3] = 255
        }

        texture.needsUpdate = true
    }
}
