/**
 * Audio Analysis v2 — SOTA Audio-Reactive Utilities
 *
 * Advanced audio analysis with psychoacoustic processing, spectral flux onset detection,
 * mel-scale frequency binning, chromagram harmonic analysis, and Circle of Fifths color mapping.
 *
 * Features:
 * - A-weighting for perceptually accurate frequency balance
 * - Rolling AGC (Automatic Gain Control) for consistent visuals across tracks
 * - Spectral flux onset detection (robust beat/transient detection)
 * - 24-band mel-scale frequency analysis (musical pitch resolution)
 * - 12-bin chromagram (pitch class / harmonic content)
 * - Circle of Fifths → hue mapping (harmonically coherent colors)
 * - Chord mood estimation (major/minor detection)
 * - Spectral centroid, spread, rolloff (timbre/brightness)
 */

import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS (Pre-computed at module load — zero per-frame cost)
// ═══════════════════════════════════════════════════════════════════════════

/** Number of FFT bins from SignalRGB */
const FFT_SIZE = 200

/** Number of mel bands for perceptual frequency analysis */
const MEL_BANDS = 24

/** Number of pitch classes for chromagram */
const PITCH_CLASSES = 12

/** Sample rate assumption (SignalRGB uses system audio) */
const SAMPLE_RATE = 44100

/** Max frequency covered by FFT */
const MAX_FREQ = SAMPLE_RATE / 2

/** Frequency per FFT bin */
const FREQ_PER_BIN = MAX_FREQ / FFT_SIZE

// ─────────────────────────────────────────────────────────────────────────────
// A-Weighting Curve (Fletcher-Munson / ISO 61672)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-computed A-weighting multipliers for each FFT bin.
 * Attenuates bass, boosts upper mids — matches human hearing sensitivity.
 */
const A_WEIGHTS = new Float32Array(FFT_SIZE)

function computeAWeight(f: number): number {
    if (f < 10) return 0 // Below audible range
    const f2 = f * f
    const f4 = f2 * f2
    const num = 12194 * 12194 * f4
    const denom = (f2 + 20.6 * 20.6) * Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) * (f2 + 12194 * 12194)
    const ra = num / denom
    // Convert to linear gain (with +2dB reference adjustment)
    const db = 20 * Math.log10(ra) + 2.0
    return 10 ** (db / 20)
}

// Initialize A-weights
for (let i = 0; i < FFT_SIZE; i++) {
    const freq = (i + 0.5) * FREQ_PER_BIN
    A_WEIGHTS[i] = computeAWeight(freq)
}

// ─────────────────────────────────────────────────────────────────────────────
// Mel Filterbank
// ─────────────────────────────────────────────────────────────────────────────

/** Mel filterbank weights - sparse representation for performance */
interface MelFilter {
    startBin: number
    endBin: number
    weights: Float32Array
}

const MEL_FILTERS: MelFilter[] = []

function hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700)
}

function melToHz(mel: number): number {
    return 700 * (10 ** (mel / 2595) - 1)
}

// Initialize mel filterbank
{
    const melMin = hzToMel(20)
    const melMax = hzToMel(MAX_FREQ * 0.95) // Slightly below Nyquist
    const melPoints = new Float32Array(MEL_BANDS + 2)

    for (let i = 0; i <= MEL_BANDS + 1; i++) {
        melPoints[i] = melToHz(melMin + ((melMax - melMin) * i) / (MEL_BANDS + 1))
    }

    for (let m = 0; m < MEL_BANDS; m++) {
        const fStart = melPoints[m]
        const fCenter = melPoints[m + 1]
        const fEnd = melPoints[m + 2]

        const startBin = Math.max(0, Math.floor(fStart / FREQ_PER_BIN))
        const endBin = Math.min(FFT_SIZE - 1, Math.ceil(fEnd / FREQ_PER_BIN))

        const weights = new Float32Array(endBin - startBin + 1)

        for (let bin = startBin; bin <= endBin; bin++) {
            const freq = (bin + 0.5) * FREQ_PER_BIN
            let weight = 0
            if (freq >= fStart && freq <= fCenter) {
                weight = (freq - fStart) / (fCenter - fStart + 0.001)
            } else if (freq > fCenter && freq <= fEnd) {
                weight = (fEnd - freq) / (fEnd - fCenter + 0.001)
            }
            weights[bin - startBin] = Math.max(0, weight)
        }

        MEL_FILTERS.push({ endBin, startBin, weights })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pitch Class Mapping (for Chromagram)
// ─────────────────────────────────────────────────────────────────────────────

/** Maps FFT bin index to pitch class (0-11), or -1 if not clearly tonal */
const BIN_TO_PITCH_CLASS = new Int8Array(FFT_SIZE)

// A4 = 440Hz = MIDI note 69
for (let i = 0; i < FFT_SIZE; i++) {
    const freq = (i + 0.5) * FREQ_PER_BIN
    if (freq < 20 || freq > 8000) {
        BIN_TO_PITCH_CLASS[i] = -1 // Out of useful range
    } else {
        const midiNote = 69 + 12 * Math.log2(freq / 440)
        const pitchClass = Math.round(midiNote) % 12
        BIN_TO_PITCH_CLASS[i] = pitchClass < 0 ? pitchClass + 12 : pitchClass
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle of Fifths → Hue Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps pitch class (0-11) to hue (0-360) using Circle of Fifths.
 * Adjacent keys on the circle get adjacent colors.
 *
 * Order: C, G, D, A, E, B, F#, C#, G#, D#, A#, F
 * Hues:  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330
 */
const PITCH_CLASS_TO_HUE = new Float32Array([
    0, // C  → Red
    210, // C# → Azure
    60, // D  → Yellow
    270, // D# → Purple
    120, // E  → Green
    330, // F  → Rose
    180, // F# → Cyan
    30, // G  → Orange
    240, // G# → Blue
    90, // A  → Lime
    300, // A# → Magenta
    150, // B  → Teal
])

/** Pitch class names for debugging/display */
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comprehensive audio analysis data for effect use.
 * All new fields are additive — existing fields unchanged for backwards compatibility.
 */
export interface AudioData {
    // ═══════════════════════════════════════════════════════════════
    // EXISTING (Backwards Compatible)
    // ═══════════════════════════════════════════════════════════════

    /** Normalized overall level (0-1) */
    level: number
    /** Raw level in dB (-100 to 0) */
    levelRaw: number
    /** Tone density / spectral flatness (0-1, 0=pure tone, 1=noise) */
    density: number
    /** Stereo width (0-1) */
    width: number
    /** Raw FFT frequency data (200 elements) */
    frequencyRaw: Int8Array
    /** Normalized frequency data (200 elements, 0-1) */
    frequency: Float32Array
    /** Bass level (0-1) */
    bass: number
    /** Mid level (0-1) */
    mid: number
    /** Treble level (0-1) */
    treble: number
    /** Beat detection (0-1) */
    beat: number
    /** Decaying beat impulse (0-1) */
    beatPulse: number
    /** Short-term level envelope */
    levelShort: number
    /** Long-term level envelope */
    levelLong: number
    /** Bass envelope (attack) */
    bassEnv: number
    /** Mid envelope (attack) */
    midEnv: number
    /** Treble envelope (attack) */
    trebleEnv: number
    /** Tempo estimate (BPM) */
    tempo: number
    /** Level momentum (-1 to 1) */
    momentum: number
    /** Positive swell (0-1) */
    swell: number

    // ═══════════════════════════════════════════════════════════════
    // NEW: Perceptual Frequency Analysis
    // ═══════════════════════════════════════════════════════════════

    /** A-weighted frequency data (200 elements, 0-1) - matches human hearing */
    frequencyWeighted: Float32Array

    /** Mel-scale frequency bands (24 elements, 0-1) - logarithmic pitch spacing */
    melBands: Float32Array

    /** Mel bands with rolling AGC normalization (24 elements, 0-1) */
    melBandsNormalized: Float32Array

    // ═══════════════════════════════════════════════════════════════
    // NEW: Onset & Rhythm Detection
    // ═══════════════════════════════════════════════════════════════

    /** Spectral flux (0-1) - measures spectrum change, robust onset detection */
    spectralFlux: number

    /** Band-specific spectral flux [bass, mid, treble] (0-1 each) */
    spectralFluxBands: Float32Array

    /** Onset strength (0-1) - thresholded, smoothed flux */
    onset: number

    /** Onset impulse (0-1) - decaying pulse on onset */
    onsetPulse: number

    /** Beat phase (0-1) - position within beat cycle, use for anticipation */
    beatPhase: number

    /** Beat confidence (0-1) - tempo tracking reliability */
    beatConfidence: number

    // ═══════════════════════════════════════════════════════════════
    // NEW: Harmonic Analysis
    // ═══════════════════════════════════════════════════════════════

    /** Chromagram / pitch class profile (12 elements, 0-1) */
    chromagram: Float32Array

    /** Dominant pitch class (0-11: C, C#, D, ..., B) */
    dominantPitch: number

    /** Dominant pitch confidence (0-1) */
    dominantPitchConfidence: number

    /** Harmonic hue (0-360) - Circle of Fifths mapped to color wheel */
    harmonicHue: number

    /** Chord mood (-1 to 1) - negative=minor/dark, positive=major/bright */
    chordMood: number

    // ═══════════════════════════════════════════════════════════════
    // NEW: Timbre & Texture
    // ═══════════════════════════════════════════════════════════════

    /** Spectral centroid / brightness (0-1) - 0=dark/bassy, 1=bright/trebly */
    brightness: number

    /** Spectral spread (0-1) - 0=narrow/tonal, 1=wide/noisy */
    spread: number

    /** Spectral rolloff (0-1) - frequency below which 85% of energy lies */
    rolloff: number

    /** Roughness / dissonance estimate (0-1) - 0=smooth, 1=harsh */
    roughness: number
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

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS STATE (Persistent across frames)
// ═══════════════════════════════════════════════════════════════════════════

/** Frequency band ranges for bass/mid/treble */
const BASS_RANGE = { end: 10, start: 0 }
const MID_RANGE = { end: 80, start: 10 }
const TREBLE_RANGE = { end: 200, start: 80 }

/** Persistent analysis state */
const state = {
    bassLong: 0,
    bassShort: 0,
    beatConfidence: 0,
    beatIntervalIdx: 0,
    beatIntervals: new Float32Array(8), // Ring buffer

    // Beat tracking
    beatPhase: 0,
    cooldown: 0,

    // Legacy beat detection
    impulse: 0,
    lastBeatTime: 0,
    levelLong: 0,

    // Envelope followers (legacy compatibility)
    levelShort: 0,
    midLong: 0,
    midShort: 0,

    // Onset detection
    onsetPulse: 0,
    onsetThreshold: 0.15,
    prevMelBands: new Float32Array(MEL_BANDS),
    // Previous frame for spectral flux
    prevSpectrum: new Float32Array(FFT_SIZE),

    // Rolling AGC
    rollingMax: 0.01,
    rollingMaxMel: new Float32Array(MEL_BANDS).fill(0.01),
    smoothBass: 0,

    // Timbre smoothing
    smoothBrightness: 0.5,
    smoothChordMood: 0,
    smoothChromagram: new Float32Array(PITCH_CLASSES),
    smoothFlux: 0,
    smoothFluxBands: new Float32Array(3),

    // Harmonic smoothing
    smoothHarmonicHue: 0,
    smoothLevel: 0,
    smoothMelBands: new Float32Array(MEL_BANDS),
    smoothMid: 0,
    smoothRolloff: 0.5,
    smoothRoughness: 0.2,

    // Smoothed values
    smoothSpectrum: new Float32Array(FFT_SIZE),
    smoothSpread: 0.3,
    smoothTreble: 0,
    tempo: 120,
    trebleLong: 0,
    trebleShort: 0,
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

function clamp(x: number, min: number, max: number): number {
    return x < min ? min : x > max ? max : x
}

/**
 * Apply A-weighting to frequency data
 */
function applyAWeighting(input: Float32Array, output: Float32Array): void {
    for (let i = 0; i < FFT_SIZE; i++) {
        output[i] = input[i] * A_WEIGHTS[i]
    }
}

/**
 * Compute mel bands from frequency data
 */
function computeMelBands(frequency: Float32Array, output: Float32Array): void {
    for (let m = 0; m < MEL_BANDS; m++) {
        const filter = MEL_FILTERS[m]
        let sum = 0
        for (let i = 0; i < filter.weights.length; i++) {
            sum += frequency[filter.startBin + i] * filter.weights[i]
        }
        output[m] = sum
    }
}

/**
 * Compute spectral flux (change from previous frame)
 */
function computeSpectralFlux(current: Float32Array, previous: Float32Array, bandFlux: Float32Array): number {
    let totalFlux = 0
    let bassFlux = 0
    let midFlux = 0
    let trebleFlux = 0

    for (let i = 0; i < FFT_SIZE; i++) {
        const diff = current[i] - previous[i]
        const rectified = diff > 0 ? diff : 0 // Half-wave rectification (only attacks)

        totalFlux += rectified

        if (i < BASS_RANGE.end) {
            bassFlux += rectified
        } else if (i < MID_RANGE.end) {
            midFlux += rectified
        } else {
            trebleFlux += rectified
        }
    }

    // Normalize by band size
    bandFlux[0] = bassFlux / BASS_RANGE.end
    bandFlux[1] = midFlux / (MID_RANGE.end - MID_RANGE.start)
    bandFlux[2] = trebleFlux / (TREBLE_RANGE.end - TREBLE_RANGE.start)

    return totalFlux / FFT_SIZE
}

/**
 * Compute chromagram (12 pitch classes)
 */
function computeChromagram(frequency: Float32Array, output: Float32Array): void {
    // Reset
    for (let i = 0; i < PITCH_CLASSES; i++) {
        output[i] = 0
    }

    // Accumulate energy per pitch class
    for (let i = 0; i < FFT_SIZE; i++) {
        const pc = BIN_TO_PITCH_CLASS[i]
        if (pc >= 0) {
            output[pc] += frequency[i]
        }
    }

    // Normalize
    let maxChroma = 0.001
    for (let i = 0; i < PITCH_CLASSES; i++) {
        if (output[i] > maxChroma) maxChroma = output[i]
    }
    for (let i = 0; i < PITCH_CLASSES; i++) {
        output[i] /= maxChroma
    }
}

/**
 * Find dominant pitch and compute harmonic hue
 */
function computeHarmonicFeatures(chromagram: Float32Array): {
    dominantPitch: number
    confidence: number
    hue: number
    chordMood: number
} {
    // Find dominant pitch
    let maxVal = 0
    let dominantPitch = 0
    let secondMax = 0

    for (let i = 0; i < PITCH_CLASSES; i++) {
        if (chromagram[i] > maxVal) {
            secondMax = maxVal
            maxVal = chromagram[i]
            dominantPitch = i
        } else if (chromagram[i] > secondMax) {
            secondMax = chromagram[i]
        }
    }

    // Confidence based on how much dominant stands out
    const confidence = maxVal > 0.001 ? (maxVal - secondMax) / maxVal : 0

    // Weighted hue from all pitch classes
    let hueX = 0
    let hueY = 0
    let totalWeight = 0

    for (let i = 0; i < PITCH_CLASSES; i++) {
        const weight = chromagram[i] * chromagram[i] // Square for emphasis on strong pitches
        const hueRad = (PITCH_CLASS_TO_HUE[i] * Math.PI) / 180
        hueX += Math.cos(hueRad) * weight
        hueY += Math.sin(hueRad) * weight
        totalWeight += weight
    }

    let hue = 0
    if (totalWeight > 0.001) {
        hue = (Math.atan2(hueY, hueX) * 180) / Math.PI
        if (hue < 0) hue += 360
    }

    // Chord mood: check for major vs minor third
    // Major: root + 4 semitones (major third)
    // Minor: root + 3 semitones (minor third)
    const majorThird = chromagram[(dominantPitch + 4) % 12]
    const minorThird = chromagram[(dominantPitch + 3) % 12]
    const fifth = chromagram[(dominantPitch + 7) % 12]

    let chordMood = 0
    if (majorThird + minorThird > 0.1) {
        // Has some third present
        const thirdBalance = (majorThird - minorThird) / (majorThird + minorThird + 0.001)
        // Weight by presence of fifth (stronger chord = more reliable)
        const chordStrength = Math.min(1, (majorThird + minorThird + fifth) / 2)
        chordMood = thirdBalance * chordStrength
    }

    return { chordMood, confidence, dominantPitch, hue }
}

/**
 * Compute spectral shape features (brightness, spread, rolloff, roughness)
 */
function computeSpectralShape(frequency: Float32Array): {
    brightness: number
    spread: number
    rolloff: number
    roughness: number
} {
    let totalEnergy = 0
    let weightedSum = 0

    for (let i = 0; i < FFT_SIZE; i++) {
        const energy = frequency[i] * frequency[i]
        totalEnergy += energy
        weightedSum += i * energy
    }

    // Spectral centroid (normalized to 0-1)
    const centroid = totalEnergy > 0.001 ? weightedSum / totalEnergy / FFT_SIZE : 0.5
    const brightness = clamp(centroid * 2, 0, 1) // Scale up since most content is in lower half

    // Spectral spread (standard deviation around centroid)
    let spreadSum = 0
    for (let i = 0; i < FFT_SIZE; i++) {
        const energy = frequency[i] * frequency[i]
        const diff = i / FFT_SIZE - centroid
        spreadSum += diff * diff * energy
    }
    const spread = totalEnergy > 0.001 ? Math.sqrt(spreadSum / totalEnergy) * 3 : 0.3
    const spreadNorm = clamp(spread, 0, 1)

    // Spectral rolloff (frequency below which 85% of energy lies)
    const rolloffThreshold = totalEnergy * 0.85
    let cumulative = 0
    let rolloffBin = FFT_SIZE - 1
    for (let i = 0; i < FFT_SIZE; i++) {
        cumulative += frequency[i] * frequency[i]
        if (cumulative >= rolloffThreshold) {
            rolloffBin = i
            break
        }
    }
    const rolloff = rolloffBin / FFT_SIZE

    // Roughness estimate (based on energy in dissonant intervals)
    // Simplified: high energy in adjacent bins = more roughness
    let roughnessSum = 0
    for (let i = 1; i < FFT_SIZE - 1; i++) {
        const local = frequency[i]
        const neighbors = (frequency[i - 1] + frequency[i + 1]) / 2
        roughnessSum += Math.abs(local - neighbors) * local
    }
    const roughness = clamp(roughnessSum * 4, 0, 1)

    return { brightness, rolloff, roughness, spread: spreadNorm }
}

/**
 * Update rolling AGC (Automatic Gain Control)
 */
function updateAGC(currentMax: number): number {
    const AGC_ATTACK = 0.3
    const AGC_DECAY = 0.002

    if (currentMax > state.rollingMax) {
        state.rollingMax = lerp(state.rollingMax, currentMax, AGC_ATTACK)
    } else {
        state.rollingMax = lerp(state.rollingMax, currentMax, AGC_DECAY)
    }

    return Math.max(state.rollingMax, 0.01)
}

/**
 * Update beat tracking
 */
function updateBeatTracking(flux: number, now: number): { phase: number; confidence: number } {
    // Detect beat when flux exceeds adaptive threshold
    const fluxThreshold = state.onsetThreshold * 1.5

    if (flux > fluxThreshold && state.cooldown <= 0) {
        // Record beat interval
        if (state.lastBeatTime > 0) {
            const interval = now - state.lastBeatTime
            if (interval > 200 && interval < 2000) {
                // 30-300 BPM range
                state.beatIntervals[state.beatIntervalIdx] = interval
                state.beatIntervalIdx = (state.beatIntervalIdx + 1) % state.beatIntervals.length
                state.tempo = 60000 / interval
            }
        }
        state.lastBeatTime = now
        state.cooldown = 0.15
        state.beatPhase = 0
    }

    // Estimate tempo from beat intervals
    let validIntervals = 0
    let avgInterval = 0
    for (let i = 0; i < state.beatIntervals.length; i++) {
        if (state.beatIntervals[i] > 0) {
            avgInterval += state.beatIntervals[i]
            validIntervals++
        }
    }

    if (validIntervals >= 3) {
        avgInterval /= validIntervals
        state.tempo = clamp(60000 / avgInterval, 60, 200)

        // Calculate phase within beat
        const timeSinceBeat = now - state.lastBeatTime
        state.beatPhase = clamp(timeSinceBeat / avgInterval, 0, 1)

        // Confidence based on consistency of intervals
        let variance = 0
        for (let i = 0; i < state.beatIntervals.length; i++) {
            if (state.beatIntervals[i] > 0) {
                const diff = state.beatIntervals[i] - avgInterval
                variance += diff * diff
            }
        }
        variance /= validIntervals
        const stdDev = Math.sqrt(variance)
        state.beatConfidence = clamp(1 - stdDev / avgInterval, 0, 1)
    } else {
        // Not enough data
        state.beatPhase = (now % 500) / 500 // Default 120bpm
        state.beatConfidence = 0
    }

    state.cooldown = Math.max(0, state.cooldown - 0.016)

    return { confidence: state.beatConfidence, phase: state.beatPhase }
}

/**
 * Normalize audio level from dB (-100 to 0) to 0-1 range
 */
export function normalizeAudioLevel(levelDb: number): number {
    return Math.max(0, Math.min(1, (levelDb + 100) / 100))
}

/**
 * Get average level for a frequency range
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

// Reusable buffers (no allocations in hot path)
const _frequencyWeighted = new Float32Array(FFT_SIZE)
const _melBands = new Float32Array(MEL_BANDS)
const _melBandsNorm = new Float32Array(MEL_BANDS)
const _chromagram = new Float32Array(PITCH_CLASSES)
const _fluxBands = new Float32Array(3)

/**
 * Get comprehensive audio analysis data from SignalRGB
 *
 * @returns Full audio analysis with all features
 *
 * @example
 * ```typescript
 * const audio = getAudioData()
 *
 * // Legacy usage still works
 * console.log(audio.bass, audio.beatPulse)
 *
 * // New features
 * console.log(audio.harmonicHue)     // 0-360, use for color
 * console.log(audio.onset)           // 0-1, robust beat detection
 * console.log(audio.melBands)        // 24 perceptual frequency bands
 * console.log(audio.chordMood)       // -1 (minor) to 1 (major)
 * ```
 */
export function getAudioData(): AudioData {
    const hasEngine = typeof engine !== 'undefined' && engine?.audio
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (!hasEngine) {
        // Return silent data for development
        return createSilentAudioData()
    }

    // ─────────────────────────────────────────────────────────────
    // RAW DATA EXTRACTION
    // ─────────────────────────────────────────────────────────────

    const levelRaw = engine.audio.level
    const frequencyRaw = new Int8Array(engine.audio.freq)
    const frequency = new Float32Array(FFT_SIZE)

    // Basic normalization
    let frameMax = 1
    for (let i = 0; i < frequencyRaw.length; i++) {
        const val = Math.abs(frequencyRaw[i])
        frequency[i] = val / 128 // Normalize to 0-1ish
        if (val > frameMax) frameMax = val
    }

    // Apply rolling AGC
    const agcMax = updateAGC(frameMax / 128)
    for (let i = 0; i < FFT_SIZE; i++) {
        frequency[i] = clamp(frequency[i] / agcMax, 0, 1)
    }

    // ─────────────────────────────────────────────────────────────
    // A-WEIGHTING
    // ─────────────────────────────────────────────────────────────

    applyAWeighting(frequency, _frequencyWeighted)

    // Renormalize after weighting
    let weightedMax = 0.001
    for (let i = 0; i < FFT_SIZE; i++) {
        if (_frequencyWeighted[i] > weightedMax) weightedMax = _frequencyWeighted[i]
    }
    for (let i = 0; i < FFT_SIZE; i++) {
        _frequencyWeighted[i] /= weightedMax
    }

    // ─────────────────────────────────────────────────────────────
    // MEL BANDS
    // ─────────────────────────────────────────────────────────────

    computeMelBands(_frequencyWeighted, _melBands)

    // Per-band AGC for normalized mel bands
    for (let m = 0; m < MEL_BANDS; m++) {
        if (_melBands[m] > state.rollingMaxMel[m]) {
            state.rollingMaxMel[m] = lerp(state.rollingMaxMel[m], _melBands[m], 0.3)
        } else {
            state.rollingMaxMel[m] = lerp(state.rollingMaxMel[m], _melBands[m], 0.005)
        }
        _melBandsNorm[m] = clamp(_melBands[m] / Math.max(state.rollingMaxMel[m], 0.01), 0, 1)
    }

    // Smooth mel bands
    for (let m = 0; m < MEL_BANDS; m++) {
        state.smoothMelBands[m] = lerp(state.smoothMelBands[m], _melBandsNorm[m], 0.4)
    }

    // ─────────────────────────────────────────────────────────────
    // SPECTRAL FLUX & ONSET
    // ─────────────────────────────────────────────────────────────

    const rawFlux = computeSpectralFlux(_frequencyWeighted, state.prevSpectrum, _fluxBands)

    // Update adaptive onset threshold
    state.onsetThreshold = lerp(state.onsetThreshold, rawFlux * 0.8, 0.05)
    state.onsetThreshold = Math.max(state.onsetThreshold, 0.05)

    // Smooth flux
    state.smoothFlux = lerp(state.smoothFlux, rawFlux, 0.5)
    for (let i = 0; i < 3; i++) {
        state.smoothFluxBands[i] = lerp(state.smoothFluxBands[i], _fluxBands[i], 0.5)
    }

    // Onset detection
    const onset = clamp((state.smoothFlux - state.onsetThreshold) / 0.2, 0, 1)

    // Onset pulse (decaying impulse)
    if (onset > 0.5) {
        state.onsetPulse = Math.max(state.onsetPulse, onset)
    }
    state.onsetPulse *= 0.85

    // Store current spectrum for next frame
    state.prevSpectrum.set(_frequencyWeighted)

    // ─────────────────────────────────────────────────────────────
    // BEAT TRACKING
    // ─────────────────────────────────────────────────────────────

    const beatInfo = updateBeatTracking(state.smoothFlux, now)

    // ─────────────────────────────────────────────────────────────
    // CHROMAGRAM & HARMONIC ANALYSIS
    // ─────────────────────────────────────────────────────────────

    computeChromagram(_frequencyWeighted, _chromagram)

    // Smooth chromagram
    for (let i = 0; i < PITCH_CLASSES; i++) {
        state.smoothChromagram[i] = lerp(state.smoothChromagram[i], _chromagram[i], 0.25)
    }

    const harmonics = computeHarmonicFeatures(state.smoothChromagram)

    // Smooth harmonic hue (handle wraparound)
    let hueDiff = harmonics.hue - state.smoothHarmonicHue
    if (hueDiff > 180) hueDiff -= 360
    if (hueDiff < -180) hueDiff += 360
    state.smoothHarmonicHue += hueDiff * 0.15
    if (state.smoothHarmonicHue < 0) state.smoothHarmonicHue += 360
    if (state.smoothHarmonicHue >= 360) state.smoothHarmonicHue -= 360

    state.smoothChordMood = lerp(state.smoothChordMood, harmonics.chordMood, 0.1)

    // ─────────────────────────────────────────────────────────────
    // SPECTRAL SHAPE (Timbre)
    // ─────────────────────────────────────────────────────────────

    const shape = computeSpectralShape(_frequencyWeighted)

    state.smoothBrightness = lerp(state.smoothBrightness, shape.brightness, 0.2)
    state.smoothSpread = lerp(state.smoothSpread, shape.spread, 0.2)
    state.smoothRolloff = lerp(state.smoothRolloff, shape.rolloff, 0.2)
    state.smoothRoughness = lerp(state.smoothRoughness, shape.roughness, 0.15)

    // ─────────────────────────────────────────────────────────────
    // LEGACY FEATURES (Backwards Compatibility)
    // ─────────────────────────────────────────────────────────────

    const bassRaw = getFrequencyRange(frequency, BASS_RANGE.start, BASS_RANGE.end)
    const midRaw = getFrequencyRange(frequency, MID_RANGE.start, MID_RANGE.end)
    const trebleRaw = getFrequencyRange(frequency, TREBLE_RANGE.start, TREBLE_RANGE.end)
    const levelNorm = normalizeAudioLevel(levelRaw)

    // Smooth bands
    state.smoothBass = lerp(state.smoothBass, bassRaw, 0.35)
    state.smoothMid = lerp(state.smoothMid, midRaw, 0.35)
    state.smoothTreble = lerp(state.smoothTreble, trebleRaw, 0.35)
    state.smoothLevel = lerp(state.smoothLevel, levelNorm, 0.3)

    // Envelope followers
    state.levelShort = lerp(state.levelShort, levelNorm, 0.3)
    state.levelLong = lerp(state.levelLong, levelNorm, 0.05)
    state.bassShort = lerp(state.bassShort, bassRaw, 0.45)
    state.bassLong = lerp(state.bassLong, bassRaw, 0.08)
    state.midShort = lerp(state.midShort, midRaw, 0.4)
    state.midLong = lerp(state.midLong, midRaw, 0.06)
    state.trebleShort = lerp(state.trebleShort, trebleRaw, 0.35)
    state.trebleLong = lerp(state.trebleLong, trebleRaw, 0.05)

    // Legacy beat detection (now enhanced with spectral flux)
    const bassDiff = Math.max(0, state.bassShort - state.bassLong)
    const combinedOnset = Math.max(bassDiff, state.smoothFlux * 0.8)

    if (combinedOnset > 0.1 + state.smoothLevel * 0.15 && state.cooldown <= 0) {
        state.impulse = 1
        state.cooldown = 0.15
    }
    state.impulse *= 0.8
    state.cooldown = Math.max(0, state.cooldown - 0.016)

    const beat = clamp(combinedOnset / (0.2 + state.smoothLevel * 0.3), 0, 1)
    const bassEnv = Math.max(0, state.bassShort - state.bassLong)
    const midEnv = Math.max(0, state.midShort - state.midLong)
    const trebleEnv = Math.max(0, state.trebleShort - state.trebleLong)

    const levelTrend = state.levelShort - state.levelLong
    const spectralTrend =
        (state.bassShort + state.midShort + state.trebleShort) / 3 -
        (state.bassLong + state.midLong + state.trebleLong) / 3
    const momentum = clamp((levelTrend * 0.6 + spectralTrend * 0.4) * 3, -1, 1)
    const swell = clamp((levelTrend + spectralTrend) * 2.2, 0, 1)

    // ─────────────────────────────────────────────────────────────
    // ASSEMBLE RESULT
    // ─────────────────────────────────────────────────────────────

    return {
        bass: state.smoothBass,
        bassEnv,
        beat,
        beatConfidence: beatInfo.confidence,
        beatPhase: beatInfo.phase,
        beatPulse: state.impulse,

        // New: Timbre
        brightness: state.smoothBrightness,
        chordMood: state.smoothChordMood,

        // New: Harmonic
        chromagram: state.smoothChromagram.slice(),
        density: engine.audio.density,
        dominantPitch: harmonics.dominantPitch,
        dominantPitchConfidence: harmonics.confidence,
        frequency,
        frequencyRaw,

        // New: Perceptual frequency
        frequencyWeighted: _frequencyWeighted.slice(),
        harmonicHue: state.smoothHarmonicHue,
        // Legacy
        level: state.smoothLevel,
        levelLong: state.levelLong,
        levelRaw,
        levelShort: state.levelShort,
        melBands: _melBands.slice(),
        melBandsNormalized: state.smoothMelBands.slice(),
        mid: state.smoothMid,
        midEnv,
        momentum,
        onset,
        onsetPulse: state.onsetPulse,
        rolloff: state.smoothRolloff,
        roughness: state.smoothRoughness,

        // New: Onset & rhythm
        spectralFlux: state.smoothFlux,
        spectralFluxBands: state.smoothFluxBands.slice(),
        spread: state.smoothSpread,
        swell,
        tempo: state.tempo,
        treble: state.smoothTreble,
        trebleEnv,
        width: engine.audio.width,
    }
}

/**
 * Create silent audio data (for dev mode)
 */
function createSilentAudioData(): AudioData {
    return {
        bass: 0,
        bassEnv: 0,
        beat: 0,
        beatConfidence: 0,
        beatPhase: 0,
        beatPulse: 0,

        brightness: 0.5,
        chordMood: 0,

        chromagram: new Float32Array(PITCH_CLASSES),
        density: 0,
        dominantPitch: 0,
        dominantPitchConfidence: 0,
        frequency: new Float32Array(FFT_SIZE),
        frequencyRaw: new Int8Array(FFT_SIZE),

        frequencyWeighted: new Float32Array(FFT_SIZE),
        harmonicHue: 0,
        level: 0,
        levelLong: 0,
        levelRaw: -100,
        levelShort: 0,
        melBands: new Float32Array(MEL_BANDS),
        melBandsNormalized: new Float32Array(MEL_BANDS),
        mid: 0,
        midEnv: 0,
        momentum: 0,
        onset: 0,
        onsetPulse: 0,
        rolloff: 0.5,
        roughness: 0.2,

        spectralFlux: 0,
        spectralFluxBands: new Float32Array(3),
        spread: 0.3,
        swell: 0,
        tempo: 120,
        treble: 0,
        trebleEnv: 0,
        width: 0.5,
    }
}

/**
 * Get screen zone color data from SignalRGB
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

    for (let i = 0; i < 560; i++) {
        saturation[i] = (engine.zone.saturation[i] ?? 0) / 100
        lightness[i] = (engine.zone.lightness[i] ?? 0) / 100
    }

    return { height: 20, hue, lightness, saturation, width: 28 }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get bass level from frequency array
 */
export function getBassLevel(frequency: Float32Array): number {
    return getFrequencyRange(frequency, BASS_RANGE.start, BASS_RANGE.end)
}

/**
 * Get mid level from frequency array
 */
export function getMidLevel(frequency: Float32Array): number {
    return getFrequencyRange(frequency, MID_RANGE.start, MID_RANGE.end)
}

/**
 * Get treble level from frequency array
 */
export function getTrebleLevel(frequency: Float32Array): number {
    return getFrequencyRange(frequency, TREBLE_RANGE.start, TREBLE_RANGE.end)
}

/**
 * Normalize a single frequency bin value
 */
export function normalizeFrequencyBin(value: number, max = 128): number {
    return Math.max(0, Math.min(1, Math.abs(value) / max))
}

/**
 * Smooth a value over time using exponential moving average
 */
export function smoothValue(currentValue: number, previousValue: number, smoothing = 0.5): number {
    return previousValue * smoothing + currentValue * (1 - smoothing)
}

/**
 * Get pitch class name from index
 */
export function getPitchClassName(pitchClass: number): string {
    return PITCH_CLASS_NAMES[pitchClass % 12]
}

/**
 * Convert pitch class name to index
 */
export function getPitchClassIndex(name: string): number {
    const idx = PITCH_CLASS_NAMES.indexOf(name.toUpperCase())
    return idx >= 0 ? idx : 0
}

/**
 * Get energy for a specific mel band range
 *
 * @param audio - Audio data
 * @param startBand - Start band (0-23)
 * @param endBand - End band (0-23)
 */
export function getMelRange(audio: AudioData, startBand: number, endBand: number): number {
    let sum = 0
    const count = Math.min(endBand, MEL_BANDS) - startBand
    for (let i = startBand; i < Math.min(endBand, MEL_BANDS); i++) {
        sum += audio.melBandsNormalized[i]
    }
    return count > 0 ? sum / count : 0
}

/**
 * Get energy for a specific pitch class from chromagram
 */
export function getPitchEnergy(audio: AudioData, pitchClass: number | string): number {
    const idx = typeof pitchClass === 'string' ? getPitchClassIndex(pitchClass) : pitchClass % 12
    return audio.chromagram[idx]
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const hNorm = h / 360

    if (s === 0) {
        return [l, l, l]
    }

    const hue2rgb = (p: number, q: number, tIn: number) => {
        let t = tIn
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const r = hue2rgb(p, q, hNorm + 1 / 3)
    const g = hue2rgb(p, q, hNorm)
    const b = hue2rgb(p, q, hNorm - 1 / 3)

    return [r, g, b]
}

/**
 * Get a color that harmonizes with the current audio
 */
export function getHarmonicColor(audio: AudioData, saturation = 0.7, lightness = 0.5): [number, number, number] {
    return hslToRgb(audio.harmonicHue, saturation, lightness)
}

/**
 * Blend between two colors based on chord mood
 */
export function getMoodColor(
    majorColor: [number, number, number],
    minorColor: [number, number, number],
    audio: AudioData,
): [number, number, number] {
    const t = audio.chordMood * 0.5 + 0.5 // -1..1 → 0..1
    return [
        minorColor[0] + (majorColor[0] - minorColor[0]) * t,
        minorColor[1] + (majorColor[1] - minorColor[1]) * t,
        minorColor[2] + (majorColor[2] - minorColor[2]) * t,
    ]
}

/**
 * Get beat anticipation value (peaks just before beat)
 */
export function getBeatAnticipation(audio: AudioData, anticipation = 0.2): number {
    const phase = audio.beatPhase
    const anticipate = phase > 1 - anticipation ? (phase - (1 - anticipation)) / anticipation : 0
    const release = phase < 0.1 ? ((0.1 - phase) / 0.1) * 0.5 : 0
    return Math.max(anticipate, release)
}

/**
 * Check if we're on a beat (within tolerance)
 */
export function isOnBeat(audio: AudioData, division = 1, tolerance = 0.1): boolean {
    const phase = (audio.beatPhase * division) % 1
    return phase < tolerance || phase > 1 - tolerance
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBGL UNIFORMS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create Three.js uniforms for audio-reactive effects
 */
export function createAudioUniforms(): Record<string, THREE.IUniform> {
    return {
        iAudioBass: { value: 0.0 },
        iAudioBassEnv: { value: 0.0 },
        iAudioBeat: { value: 0.0 },
        iAudioBeatConfidence: { value: 0.0 },

        // NEW: Beat tracking
        iAudioBeatPhase: { value: 0.0 },
        iAudioBeatPulse: { value: 0.0 },

        // NEW: Timbre
        iAudioBrightness: { value: 0.5 },
        iAudioChordMood: { value: 0.0 },

        // NEW: Chromagram texture (16x1 RGBA, 12 used)
        iAudioChromagram: {
            value: new THREE.DataTexture(new Uint8Array(16 * 4), 16, 1, THREE.RGBAFormat, THREE.UnsignedByteType),
        },
        iAudioDensity: { value: 0.0 },
        iAudioDominantPitch: { value: 0 },
        iAudioFluxBands: { value: new THREE.Vector3(0, 0, 0) },

        // NEW: Harmonic analysis
        iAudioHarmonicHue: { value: 0.0 },
        // Legacy uniforms
        iAudioLevel: { value: 0.0 },
        iAudioLevelLong: { value: 0.0 },
        iAudioLevelRaw: { value: -100.0 },
        iAudioLevelShort: { value: 0.0 },

        // NEW: Mel bands texture (32x1 RGBA, 24 used)
        iAudioMelBands: {
            value: new THREE.DataTexture(new Uint8Array(32 * 4), 32, 1, THREE.RGBAFormat, THREE.UnsignedByteType),
        },
        iAudioMid: { value: 0.0 },
        iAudioMidEnv: { value: 0.0 },
        iAudioMomentum: { value: 0.0 },

        // NEW: Onset detection
        iAudioOnset: { value: 0.0 },
        iAudioOnsetPulse: { value: 0.0 },
        iAudioRolloff: { value: 0.5 },
        iAudioRoughness: { value: 0.2 },
        iAudioSpectralFlux: { value: 0.0 },

        // Spectrum texture (256x1 RGBA)
        iAudioSpectrum: {
            value: new THREE.DataTexture(new Uint8Array(256 * 4), 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType),
        },
        iAudioSpread: { value: 0.3 },
        iAudioSwell: { value: 0.0 },
        iAudioTempo: { value: 120.0 },
        iAudioTreble: { value: 0.0 },
        iAudioTrebleEnv: { value: 0.0 },
        iAudioWidth: { value: 0.5 },
    }
}

/**
 * Update audio uniforms with current data
 */
export function updateAudioUniforms(uniforms: Record<string, THREE.IUniform>, audio: AudioData): void {
    // Legacy uniforms
    if (uniforms.iAudioLevel) uniforms.iAudioLevel.value = audio.level
    if (uniforms.iAudioLevelShort) uniforms.iAudioLevelShort.value = audio.levelShort
    if (uniforms.iAudioLevelLong) uniforms.iAudioLevelLong.value = audio.levelLong
    if (uniforms.iAudioLevelRaw) uniforms.iAudioLevelRaw.value = audio.levelRaw
    if (uniforms.iAudioDensity) uniforms.iAudioDensity.value = audio.density
    if (uniforms.iAudioWidth) uniforms.iAudioWidth.value = audio.width
    if (uniforms.iAudioBass) uniforms.iAudioBass.value = audio.bass
    if (uniforms.iAudioMid) uniforms.iAudioMid.value = audio.mid
    if (uniforms.iAudioTreble) uniforms.iAudioTreble.value = audio.treble
    if (uniforms.iAudioBeat) uniforms.iAudioBeat.value = audio.beat
    if (uniforms.iAudioBeatPulse) uniforms.iAudioBeatPulse.value = audio.beatPulse
    if (uniforms.iAudioBassEnv) uniforms.iAudioBassEnv.value = audio.bassEnv
    if (uniforms.iAudioMidEnv) uniforms.iAudioMidEnv.value = audio.midEnv
    if (uniforms.iAudioTrebleEnv) uniforms.iAudioTrebleEnv.value = audio.trebleEnv
    if (uniforms.iAudioMomentum) uniforms.iAudioMomentum.value = audio.momentum
    if (uniforms.iAudioSwell) uniforms.iAudioSwell.value = audio.swell
    if (uniforms.iAudioTempo) uniforms.iAudioTempo.value = audio.tempo

    // NEW: Onset & rhythm
    if (uniforms.iAudioOnset) uniforms.iAudioOnset.value = audio.onset
    if (uniforms.iAudioOnsetPulse) uniforms.iAudioOnsetPulse.value = audio.onsetPulse
    if (uniforms.iAudioSpectralFlux) uniforms.iAudioSpectralFlux.value = audio.spectralFlux
    if (uniforms.iAudioFluxBands) {
        uniforms.iAudioFluxBands.value.set(
            audio.spectralFluxBands[0],
            audio.spectralFluxBands[1],
            audio.spectralFluxBands[2],
        )
    }

    // NEW: Beat tracking
    if (uniforms.iAudioBeatPhase) uniforms.iAudioBeatPhase.value = audio.beatPhase
    if (uniforms.iAudioBeatConfidence) uniforms.iAudioBeatConfidence.value = audio.beatConfidence

    // NEW: Harmonic
    if (uniforms.iAudioHarmonicHue) uniforms.iAudioHarmonicHue.value = audio.harmonicHue
    if (uniforms.iAudioChordMood) uniforms.iAudioChordMood.value = audio.chordMood
    if (uniforms.iAudioDominantPitch) uniforms.iAudioDominantPitch.value = audio.dominantPitch

    // NEW: Timbre
    if (uniforms.iAudioBrightness) uniforms.iAudioBrightness.value = audio.brightness
    if (uniforms.iAudioSpread) uniforms.iAudioSpread.value = audio.spread
    if (uniforms.iAudioRolloff) uniforms.iAudioRolloff.value = audio.rolloff
    if (uniforms.iAudioRoughness) uniforms.iAudioRoughness.value = audio.roughness

    // Update spectrum texture
    if (uniforms.iAudioSpectrum?.value instanceof THREE.DataTexture) {
        const texture = uniforms.iAudioSpectrum.value
        const data = texture.image.data as Uint8Array

        for (let i = 0; i < FFT_SIZE; i++) {
            state.smoothSpectrum[i] = lerp(state.smoothSpectrum[i], audio.frequencyWeighted[i], 0.4)
        }

        for (let i = 0; i < FFT_SIZE; i++) {
            const idx = i * 4
            const val = Math.floor(state.smoothSpectrum[i] * 255)
            data[idx] = val
            data[idx + 1] = val
            data[idx + 2] = val
            data[idx + 3] = 255
        }
        for (let i = FFT_SIZE; i < 256; i++) {
            const idx = i * 4
            data[idx] = 0
            data[idx + 1] = 0
            data[idx + 2] = 0
            data[idx + 3] = 255
        }

        texture.needsUpdate = true
    }

    // Update mel bands texture
    if (uniforms.iAudioMelBands?.value instanceof THREE.DataTexture) {
        const texture = uniforms.iAudioMelBands.value
        const data = texture.image.data as Uint8Array

        for (let i = 0; i < MEL_BANDS; i++) {
            const idx = i * 4
            const val = Math.floor(audio.melBandsNormalized[i] * 255)
            data[idx] = val
            data[idx + 1] = val
            data[idx + 2] = val
            data[idx + 3] = 255
        }
        for (let i = MEL_BANDS; i < 32; i++) {
            const idx = i * 4
            data[idx] = 0
            data[idx + 1] = 0
            data[idx + 2] = 0
            data[idx + 3] = 255
        }

        texture.needsUpdate = true
    }

    // Update chromagram texture
    if (uniforms.iAudioChromagram?.value instanceof THREE.DataTexture) {
        const texture = uniforms.iAudioChromagram.value
        const data = texture.image.data as Uint8Array

        for (let i = 0; i < PITCH_CLASSES; i++) {
            const idx = i * 4
            const val = Math.floor(audio.chromagram[i] * 255)
            data[idx] = val
            data[idx + 1] = val
            data[idx + 2] = val
            data[idx + 3] = 255
        }
        for (let i = PITCH_CLASSES; i < 16; i++) {
            const idx = i * 4
            data[idx] = 0
            data[idx + 1] = 0
            data[idx + 2] = 0
            data[idx + 3] = 255
        }

        texture.needsUpdate = true
    }
}
