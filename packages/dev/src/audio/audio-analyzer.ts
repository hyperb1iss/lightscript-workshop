/**
 * Audio Analyzer for Dev Studio
 *
 * Provides Web Audio API-based analysis to simulate SignalRGB's engine.audio
 * Supports microphone input and system audio (where available)
 */

import { createDebugLogger } from '@lightscript/core/utils/debug'

const debug = createDebugLogger('AudioAnalyzer')

export type AudioSourceType = 'none' | 'microphone' | 'system'

/** Storage key for audio settings */
const STORAGE_KEY = 'lightscript-audio-settings'

/** Default audio settings */
const DEFAULT_SETTINGS = {
    gain: 1.0,
    smoothing: 0.85,
    source: 'none' as AudioSourceType,
}

/**
 * SignalRGB-compatible audio data structure
 */
interface SignalRGBAudioData {
    /** Audio level in dB (-100 to 0) */
    level: number
    /** Tone density (0-1, roughness) */
    density: number
    /** Stereo width (0-1) */
    width: number
    /** FFT frequency data (200 elements) */
    freq: Int8Array
}

/**
 * Audio analyzer that feeds the global engine.audio object
 */
export class DevAudioAnalyzer {
    private audioContext: AudioContext | null = null
    private analyser: AnalyserNode | null = null
    private gainNode: GainNode | null = null
    private sourceNode: MediaStreamAudioSourceNode | null = null
    private stream: MediaStream | null = null

    // Analysis buffers (typed loosely to avoid TypeScript ArrayBuffer vs ArrayBufferLike issues)
    private frequencyData = new Uint8Array(256)
    private timeDomainData = new Uint8Array(256)

    // Output data (SignalRGB format)
    private audioData: SignalRGBAudioData = {
        density: 0,
        freq: new Int8Array(200),
        level: -100,
        width: 0.5,
    }

    private animationId: number | null = null
    private currentSource: AudioSourceType = 'none'
    private smoothedLevel = -100
    private smoothedDensity = 0
    private smoothedFreq = new Float32Array(200)

    // User-controllable settings
    private gain = DEFAULT_SETTINGS.gain
    private smoothing = DEFAULT_SETTINGS.smoothing

    constructor() {
        this.loadSettings()
    }

    /**
     * Get the current audio source type
     */
    public getSource(): AudioSourceType {
        return this.currentSource
    }

    /**
     * Get current gain value (0-3)
     */
    public getGain(): number {
        return this.gain
    }

    /**
     * Set gain value (0-3)
     */
    public setGain(value: number): void {
        this.gain = Math.max(0, Math.min(3, value))
        if (this.gainNode) {
            this.gainNode.gain.value = this.gain
        }
        this.saveSettings()
    }

    /**
     * Get current smoothing value (0-0.95)
     */
    public getSmoothing(): number {
        return this.smoothing
    }

    /**
     * Set smoothing value (0-0.95)
     */
    public setSmoothing(value: number): void {
        this.smoothing = Math.max(0, Math.min(0.95, value))
        this.saveSettings()
    }

    /**
     * Load settings from localStorage
     */
    private loadSettings(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const settings = JSON.parse(saved)
                this.gain = settings.gain ?? DEFAULT_SETTINGS.gain
                this.smoothing = settings.smoothing ?? DEFAULT_SETTINGS.smoothing
                debug('info', 'Loaded audio settings', { gain: this.gain, smoothing: this.smoothing })
            }
        } catch (e) {
            debug('warn', 'Failed to load audio settings', e)
        }
    }

    /**
     * Save settings to localStorage
     */
    private saveSettings(): void {
        try {
            const settings = {
                gain: this.gain,
                smoothing: this.smoothing,
                source: this.currentSource,
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
        } catch (e) {
            debug('warn', 'Failed to save audio settings', e)
        }
    }

    /**
     * Get saved source preference (for auto-restore)
     */
    public getSavedSource(): AudioSourceType {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const settings = JSON.parse(saved)
                return settings.source ?? 'none'
            }
        } catch {
            // ignore
        }
        return 'none'
    }

    /**
     * Check if audio capture is available
     */
    public static isAvailable(): boolean {
        return !!navigator.mediaDevices?.getUserMedia
    }

    /**
     * Check if system audio capture is potentially available
     * Note: getDisplayMedia with audio is limited browser support
     */
    public static isSystemAudioAvailable(): boolean {
        return !!(navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)
    }

    /**
     * Start capturing audio from microphone
     */
    public async startMicrophone(): Promise<void> {
        await this.stop()

        try {
            debug('info', 'Requesting microphone access...')

            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    autoGainControl: false,
                    echoCancellation: false,
                    noiseSuppression: false,
                },
            })

            await this.initializeAnalyzer(this.stream)
            this.currentSource = 'microphone'
            this.startAnalysisLoop()

            debug('success', 'Microphone capture started')
        } catch (error) {
            debug('error', 'Failed to start microphone:', error)
            throw error
        }
    }

    /**
     * Start capturing system audio via screen share
     * Note: Requires user to share a tab with audio
     */
    public async startSystemAudio(): Promise<void> {
        await this.stop()

        try {
            debug('info', 'Requesting system audio access...')

            // Request screen share with audio
            // User must select a browser tab with audio playing
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: true, // Required for getDisplayMedia, we'll ignore it
            })

            // Check if we got audio
            const audioTracks = this.stream.getAudioTracks()
            if (audioTracks.length === 0) {
                throw new Error('No audio track in the selected source. Try sharing a browser tab with audio playing.')
            }

            await this.initializeAnalyzer(this.stream)
            this.currentSource = 'system'
            this.startAnalysisLoop()

            debug('success', 'System audio capture started')
        } catch (error) {
            debug('error', 'Failed to start system audio:', error)
            throw error
        }
    }

    /**
     * Stop audio capture
     */
    public async stop(): Promise<void> {
        // Stop analysis loop
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }

        // Disconnect source
        if (this.sourceNode) {
            this.sourceNode.disconnect()
            this.sourceNode = null
        }

        // Stop stream tracks
        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop()
            }
            this.stream = null
        }

        // Close audio context
        if (this.audioContext) {
            await this.audioContext.close()
            this.audioContext = null
            this.analyser = null
        }

        // Reset audio data
        this.audioData = {
            density: 0,
            freq: new Int8Array(200),
            level: -100,
            width: 0.5,
        }
        this.smoothedLevel = -100
        this.smoothedDensity = 0

        // Update global engine
        this.updateGlobalEngine()

        this.currentSource = 'none'
        debug('info', 'Audio capture stopped')
    }

    /**
     * Initialize the Web Audio analyzer
     */
    private async initializeAnalyzer(stream: MediaStream): Promise<void> {
        this.audioContext = new AudioContext()
        this.analyser = this.audioContext.createAnalyser()
        this.gainNode = this.audioContext.createGain()

        // Apply saved gain
        this.gainNode.gain.value = this.gain

        // Configure analyzer for 200-bin FFT output
        // FFT size of 512 gives us 256 frequency bins
        this.analyser.fftSize = 512
        this.analyser.smoothingTimeConstant = 0.75 // Base smoothing in analyzer (reduces jitter)
        this.analyser.minDecibels = -90
        this.analyser.maxDecibels = -10

        // Update buffers for new FFT size
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
        this.timeDomainData = new Uint8Array(this.analyser.fftSize)

        // Connect source -> gain -> analyzer
        this.sourceNode = this.audioContext.createMediaStreamSource(stream)
        this.sourceNode.connect(this.gainNode)
        this.gainNode.connect(this.analyser)

        debug('info', 'Audio analyzer initialized', {
            fftSize: this.analyser.fftSize,
            frequencyBinCount: this.analyser.frequencyBinCount,
            gain: this.gain,
        })
    }

    /**
     * Start the analysis loop
     */
    private startAnalysisLoop(): void {
        const analyze = () => {
            this.animationId = requestAnimationFrame(analyze)
            this.performAnalysis()
        }
        analyze()
    }

    /**
     * Perform audio analysis and update global engine
     */
    private performAnalysis(): void {
        if (!this.analyser) return

        const smooth = this.smoothing
        const attack = 1 - smooth // How fast to respond to increases

        // Get frequency data (cast to satisfy strict TypeScript ArrayBuffer checking)
        this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>)
        this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>)

        // Calculate overall level in dB
        let sum = 0
        for (let i = 0; i < this.frequencyData.length; i++) {
            sum += this.frequencyData[i]
        }
        const avgLevel = sum / this.frequencyData.length
        const levelDb = avgLevel === 0 ? -100 : 20 * Math.log10(avgLevel / 255)

        // Smooth the level (use user smoothing)
        this.smoothedLevel = this.smoothedLevel * smooth + levelDb * attack

        // Calculate density (spectral flatness approximation)
        // Higher flatness = more noise-like, lower = more tonal
        let geometricMean = 0
        let arithmeticMean = 0
        let nonZeroCount = 0

        for (let i = 0; i < this.frequencyData.length; i++) {
            const val = this.frequencyData[i] / 255
            if (val > 0.001) {
                geometricMean += Math.log(val)
                arithmeticMean += val
                nonZeroCount++
            }
        }

        let density = 0
        if (nonZeroCount > 0 && arithmeticMean > 0) {
            geometricMean = Math.exp(geometricMean / nonZeroCount)
            arithmeticMean = arithmeticMean / nonZeroCount
            density = geometricMean / arithmeticMean
        }

        // Smooth density
        this.smoothedDensity = this.smoothedDensity * smooth + density * attack

        // Map frequency data to 200 elements (SignalRGB format) with smoothing
        // Web Audio gives us 256 bins, we need to map to 200
        for (let i = 0; i < 200; i++) {
            const sourceIndex = Math.floor((i / 200) * this.frequencyData.length)
            const rawVal = this.frequencyData[sourceIndex] / 255

            // Apply smoothing to frequency data
            this.smoothedFreq[i] = this.smoothedFreq[i] * smooth + rawVal * attack

            // Convert to signed byte (-128 to 127) for SignalRGB format
            this.audioData.freq[i] = Math.floor(this.smoothedFreq[i] * 127)
        }

        // Update audio data
        this.audioData.level = Math.max(-100, Math.min(0, this.smoothedLevel))
        this.audioData.density = Math.max(0, Math.min(1, this.smoothedDensity))
        // Width is always 0.5 since we don't have true stereo analysis
        this.audioData.width = 0.5

        // Update global engine
        this.updateGlobalEngine()
    }

    /**
     * Update the global engine.audio object
     */
    private updateGlobalEngine(): void {
        // Create or update global engine object
        if (typeof window !== 'undefined') {
            // Initialize engine if it doesn't exist
            if (!(window as Record<string, unknown>).engine) {
                ;(window as Record<string, unknown>).engine = {
                    audio: this.audioData,
                    vision: {},
                    zone: {
                        hue: new Float32Array(560),
                        lightness: new Float32Array(560),
                        saturation: new Float32Array(560),
                    },
                }
            } else {
                // Update just the audio portion
                const engine = (window as Record<string, unknown>).engine as Record<string, unknown>
                engine.audio = this.audioData
            }
        }
    }

    /**
     * Get current audio data (for debugging/display)
     */
    public getAudioData(): SignalRGBAudioData {
        return this.audioData
    }
}

// Singleton instance for the dev studio
let analyzerInstance: DevAudioAnalyzer | null = null

/**
 * Get the shared audio analyzer instance
 */
export function getAudioAnalyzer(): DevAudioAnalyzer {
    if (!analyzerInstance) {
        analyzerInstance = new DevAudioAnalyzer()
    }
    return analyzerInstance
}
