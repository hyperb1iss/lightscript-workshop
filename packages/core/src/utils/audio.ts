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
    /** Beat energy (0-1) */
    beat: number
    /** Decaying beat impulse (0-1) */
    beatPulse: number
    /** Short-term overall level */
    levelShort: number
    /** Long-term overall level */
    levelLong: number
    /** Bass envelope (short-long) */
    bassEnv: number
    /** Mid envelope */
    midEnv: number
    /** Treble envelope */
    trebleEnv: number
    /** Tempo estimate (BPM) */
    tempo: number
    /** Level momentum (-1 to 1) based on short vs long envelopes */
    momentum: number
    /** Positive swell (0-1) indicating how much energy is building */
    swell: number
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

const beatState = {
    bassLong: 0,
    bassShort: 0,
    cooldown: 0,
    impulse: 0,
    lastBeatTime: 0,
    levelLong: 0,
    levelShort: 0,
    longBass: 0,
    midLong: 0,
    midShort: 0,
    shortBass: 0,
    // Smoothed frequency bands for less jitter
    smoothBass: 0,
    smoothLevel: 0,
    smoothMid: 0,
    // Smoothed spectrum for texture (reduces per-pixel flicker)
    smoothSpectrum: new Float32Array(200),
    smoothTreble: 0,
    tempo: 120,
    trebleLong: 0,
    trebleShort: 0,
}

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
        const silentBeat = computeBeat(0, 0, 0, 0)
        return {
            bass: 0,
            bassEnv: silentBeat.bassEnv,
            beat: silentBeat.beat,
            beatPulse: silentBeat.pulse,
            density: 0,
            frequency: new Float32Array(200),
            frequencyRaw: new Int8Array(200),
            level: 0,
            levelLong: silentBeat.levelLong,
            levelRaw: -100,
            levelShort: silentBeat.levelShort,
            mid: 0,
            midEnv: silentBeat.midEnv,
            momentum: silentBeat.momentum,
            swell: silentBeat.swell,
            tempo: silentBeat.tempo,
            treble: 0,
            trebleEnv: silentBeat.trebleEnv,
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

    const bassRaw = getFrequencyRange(frequency, BASS_RANGE.start, BASS_RANGE.end)
    const midRaw = getFrequencyRange(frequency, MID_RANGE.start, MID_RANGE.end)
    const trebleRaw = getFrequencyRange(frequency, TREBLE_RANGE.start, TREBLE_RANGE.end)
    const levelRawNorm = normalizeAudioLevel(levelRaw)

    // Apply smoothing to reduce frame-to-frame jitter
    beatState.smoothBass = lerp(beatState.smoothBass, bassRaw, 0.35)
    beatState.smoothMid = lerp(beatState.smoothMid, midRaw, 0.35)
    beatState.smoothTreble = lerp(beatState.smoothTreble, trebleRaw, 0.35)
    beatState.smoothLevel = lerp(beatState.smoothLevel, levelRawNorm, 0.3)

    const bass = beatState.smoothBass
    const mid = beatState.smoothMid
    const treble = beatState.smoothTreble
    const level = beatState.smoothLevel
    const beat = computeBeat(bassRaw, midRaw, trebleRaw, levelRawNorm)

    return {
        bass,
        bassEnv: beat.bassEnv,
        beat: beat.beat,
        beatPulse: beat.pulse,
        density: engine.audio.density,
        frequency,
        frequencyRaw,
        level,
        levelLong: beat.levelLong,
        levelRaw,
        levelShort: beat.levelShort,
        mid,
        midEnv: beat.midEnv,
        momentum: beat.momentum,
        swell: beat.swell,
        tempo: beat.tempo,
        treble,
        trebleEnv: beat.trebleEnv,
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
    return Math.max(0, Math.min(1, (levelDb + 100) / 100))
}

function computeBeat(bass: number, mid: number, treble: number, level: number) {
    beatState.levelShort = lerp(beatState.levelShort, level, 0.3)
    beatState.levelLong = lerp(beatState.levelLong, level, 0.05)

    beatState.bassShort = lerp(beatState.bassShort, bass, 0.45)
    beatState.bassLong = lerp(beatState.bassLong, bass, 0.08)
    beatState.midShort = lerp(beatState.midShort, mid, 0.4)
    beatState.midLong = lerp(beatState.midLong, mid, 0.06)
    beatState.trebleShort = lerp(beatState.trebleShort, treble, 0.35)
    beatState.trebleLong = lerp(beatState.trebleLong, treble, 0.05)

    const diff = Math.max(0, beatState.bassShort - beatState.bassLong)
    const threshold = 0.05 + level * 0.15

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (diff > threshold && beatState.cooldown <= 0) {
        beatState.impulse = 1
        beatState.cooldown = 0.2
        if (beatState.lastBeatTime !== 0) {
            const interval = now - beatState.lastBeatTime
            if (interval > 0) {
                beatState.tempo = Math.max(60, Math.min(180, 60000 / interval))
            }
        }
        beatState.lastBeatTime = now
    }

    // Faster decay for smoother visuals (was 0.9, now 0.75)
    beatState.impulse *= 0.75
    beatState.cooldown = Math.max(0, beatState.cooldown - 0.025)

    const beat = Math.min(1, diff / (0.2 + level * 0.4))
    const bassEnv = Math.max(0, beatState.bassShort - beatState.bassLong)
    const midEnv = Math.max(0, beatState.midShort - beatState.midLong)
    const trebleEnv = Math.max(0, beatState.trebleShort - beatState.trebleLong)

    const levelTrend = beatState.levelShort - beatState.levelLong
    const spectralTrend =
        (beatState.bassShort + beatState.midShort + beatState.trebleShort) / 3 -
        (beatState.bassLong + beatState.midLong + beatState.trebleLong) / 3
    const combinedTrend = levelTrend * 0.6 + spectralTrend * 0.4
    const momentum = Math.max(-1, Math.min(1, combinedTrend * 3.0))
    const swell = Math.max(0, Math.min(1, (levelTrend + spectralTrend) * 2.2))

    return {
        bassEnv,
        beat,
        levelLong: beatState.levelLong,
        levelShort: beatState.levelShort,
        midEnv,
        momentum,
        pulse: beatState.impulse,
        swell,
        tempo: beatState.tempo,
        trebleEnv,
    }
}

function lerp(current: number, target: number, amount: number): number {
    return current + (target - current) * amount
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
        /** Bass envelope */
        iAudioBassEnv: { value: 0.0 },
        /** Beat energy (0-1) */
        iAudioBeat: { value: 0.0 },
        /** Beat impulse/zoom pulse */
        iAudioBeatPulse: { value: 0.0 },
        /** Tone density (0-1) */
        iAudioDensity: { value: 0.0 },
        /** Overall audio level (0-1) */
        iAudioLevel: { value: 0.0 },
        /** Long-term audio level */
        iAudioLevelLong: { value: 0.0 },
        /** Audio level in dB (-100 to 0) */
        iAudioLevelRaw: { value: -100.0 },
        /** Short-term audio level */
        iAudioLevelShort: { value: 0.0 },
        /** Mid frequency level (0-1) */
        iAudioMid: { value: 0.0 },
        /** Mid envelope */
        iAudioMidEnv: { value: 0.0 },
        /** Audio momentum (level trend) */
        iAudioMomentum: { value: 0.0 },
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
        /** Audio swell (0-1) */
        iAudioSwell: { value: 0.0 },
        /** Beat tempo estimate (BPM) */
        iAudioTempo: { value: 120.0 },
        /** Treble frequency level (0-1) */
        iAudioTreble: { value: 0.0 },
        /** Treble envelope */
        iAudioTrebleEnv: { value: 0.0 },
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
    if (uniforms.iAudioLevelShort) uniforms.iAudioLevelShort.value = audio.levelShort
    if (uniforms.iAudioLevelLong) uniforms.iAudioLevelLong.value = audio.levelLong
    if (uniforms.iAudioLevelRaw) uniforms.iAudioLevelRaw.value = audio.levelRaw
    if (uniforms.iAudioDensity) uniforms.iAudioDensity.value = audio.density
    if (uniforms.iAudioBeat) uniforms.iAudioBeat.value = audio.beat
    if (uniforms.iAudioBeatPulse) uniforms.iAudioBeatPulse.value = audio.beatPulse
    if (uniforms.iAudioMomentum) uniforms.iAudioMomentum.value = audio.momentum
    if (uniforms.iAudioSwell) uniforms.iAudioSwell.value = audio.swell
    if (uniforms.iAudioTempo) uniforms.iAudioTempo.value = audio.tempo
    if (uniforms.iAudioWidth) uniforms.iAudioWidth.value = audio.width
    if (uniforms.iAudioBass) uniforms.iAudioBass.value = audio.bass
    if (uniforms.iAudioBassEnv) uniforms.iAudioBassEnv.value = audio.bassEnv
    if (uniforms.iAudioMid) uniforms.iAudioMid.value = audio.mid
    if (uniforms.iAudioMidEnv) uniforms.iAudioMidEnv.value = audio.midEnv
    if (uniforms.iAudioTreble) uniforms.iAudioTreble.value = audio.treble
    if (uniforms.iAudioTrebleEnv) uniforms.iAudioTrebleEnv.value = audio.trebleEnv

    // Update spectrum texture with smoothing
    if (uniforms.iAudioSpectrum?.value instanceof THREE.DataTexture) {
        const texture = uniforms.iAudioSpectrum.value
        const data = texture.image.data as Uint8Array

        // Smooth spectrum data to reduce flicker (lerp factor 0.4 = responsive but smooth)
        const smoothFactor = 0.4
        for (let i = 0; i < 200; i++) {
            beatState.smoothSpectrum[i] =
                beatState.smoothSpectrum[i] * (1 - smoothFactor) + audio.frequency[i] * smoothFactor
        }

        // Pack smoothed frequency data into RGBA texture (200 values → 256 slots)
        for (let i = 0; i < 200; i++) {
            const idx = i * 4
            const val = Math.floor(beatState.smoothSpectrum[i] * 255)
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
