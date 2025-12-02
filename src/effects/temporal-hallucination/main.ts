/**
 * Temporal Hallucination - Canvas Effect
 * Echo trails with rotational/offset feedback and phase-shifted colors
 */

import {
    CanvasEffect,
    type CanvasEffectConfig,
    Effect,
    initializeEffect,
    NumberControl,
    normalizePercentage,
    normalizeSpeed,
} from '@lightscript/core'

interface TemporalHallucinationControls {
    speed: number
    colorIntensity: number
    colorSaturation: number
    echoStrength: number
    echoes: number
    rotation: number
    offset: number
    density: number
    hueShiftSpeed: number
    feedbackFade: number
}

@Effect({
    author: 'hyperb1iss',
    description: 'Dreamy echo trails that seem to anticipate motion with rotating, offset feedback',
    name: 'Temporal Hallucination',
})
export class TemporalHallucinationEffect extends CanvasEffect<TemporalHallucinationControls> {
    // ═══════════════════════════════════════════════════════════════
    // ANIMATION
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 5,
        label: 'Speed',
        max: 10,
        min: 1,
        tooltip: 'Animation speed (nonlinear)',
    })
    speed!: number

    @NumberControl({
        default: 60,
        label: 'Hue Shift Speed',
        max: 200,
        min: 0,
        tooltip: 'Speed of color cycling',
    })
    hueShiftSpeed!: number

    // ═══════════════════════════════════════════════════════════════
    // ECHO
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 3,
        label: 'Echo Count',
        max: 5,
        min: 1,
        tooltip: 'How many echo layers to draw each frame',
    })
    echoes!: number

    @NumberControl({
        default: 70,
        label: 'Echo Strength',
        max: 100,
        min: 0,
        tooltip: 'Opacity of echo layers (higher = brighter echoes)',
    })
    echoStrength!: number

    @NumberControl({
        default: 6,
        label: 'Rotation (deg)',
        max: 45,
        min: -45,
        tooltip: 'Rotation per echo layer in degrees',
    })
    rotation!: number

    @NumberControl({
        default: 6,
        label: 'Offset (px)',
        max: 100,
        min: 0,
        tooltip: 'Translation per echo layer in pixels',
    })
    offset!: number

    @NumberControl({
        default: 24,
        label: 'Feedback Fade',
        max: 70,
        min: 5,
        tooltip: 'Per-frame black fade (percent). Lower = longer trails, higher = shorter trails',
    })
    feedbackFade!: number

    // ═══════════════════════════════════════════════════════════════
    // PATTERN
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 35,
        label: 'Motif Density',
        max: 200,
        min: 5,
        tooltip: 'Number of arcs/segments drawn each frame',
    })
    density!: number

    // ═══════════════════════════════════════════════════════════════
    // COLOR
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 120,
        label: 'Color Intensity',
        max: 200,
        min: 10,
        tooltip: 'Brightness multiplier for colors',
    })
    colorIntensity!: number

    @NumberControl({
        default: 120,
        label: 'Color Saturation',
        max: 200,
        min: 0,
        tooltip: 'Saturation multiplier',
    })
    colorSaturation!: number

    // Internal state
    protected normalizedSpeed = 1.0
    protected intensityFactor = 1.0
    protected saturationFactor = 1.0
    protected echoAlpha = 0.6
    protected echoCount = 3
    protected echoRotationRad = 0.1
    protected echoOffsetPx = 6
    protected motifCount = 40
    protected hueSpeed = 0.6
    protected fadeAlpha = 0.24

    private feedbackCanvas: HTMLCanvasElement | null = null
    private feedbackCtx: CanvasRenderingContext2D | null = null

    constructor() {
        const config: CanvasEffectConfig = {
            backgroundColor: 'rgba(0,0,0,1)',
            canvasHeight: 320,
            canvasWidth: 480,
            debug: true,
            id: 'temporal-hallucination',
            name: 'Temporal Hallucination',
        }
        super(config)
    }

    protected initializeControls(): void {
        const w = window as Record<string, unknown>
        w.speed = 5
        w.colorIntensity = 120
        w.colorSaturation = 120
        w.echoStrength = 70
        w.echoes = 3
        w.rotation = 6
        w.offset = 6
        w.density = 35
        w.hueShiftSpeed = 60
        w.feedbackFade = 24
    }

    protected getControlValues(): TemporalHallucinationControls {
        const w = window as Record<string, unknown>
        return {
            colorIntensity: (w.colorIntensity as number) ?? 120,
            colorSaturation: (w.colorSaturation as number) ?? 120,
            density: (w.density as number) ?? 35,
            echoes: (w.echoes as number) ?? 3,
            echoStrength: (w.echoStrength as number) ?? 70,
            feedbackFade: (w.feedbackFade as number) ?? 24,
            hueShiftSpeed: (w.hueShiftSpeed as number) ?? 60,
            offset: (w.offset as number) ?? 6,
            rotation: (w.rotation as number) ?? 6,
            speed: (w.speed as number) ?? 5,
        }
    }

    protected applyControls(controls: TemporalHallucinationControls): void {
        this.normalizedSpeed = normalizeSpeed(controls.speed)
        this.intensityFactor = normalizePercentage(controls.colorIntensity, 120, 0.05)
        this.saturationFactor = normalizePercentage(controls.colorSaturation, 120, 0.05)
        this.echoAlpha = Math.max(0, Math.min(1, controls.echoStrength / 100))
        this.echoCount = Math.max(1, Math.min(5, Math.round(controls.echoes)))
        this.echoRotationRad = (controls.rotation * Math.PI) / 180
        this.echoOffsetPx = Math.max(0, controls.offset)
        this.motifCount = Math.max(5, Math.min(400, Math.round(controls.density)))
        this.hueSpeed = normalizePercentage(controls.hueShiftSpeed, 60, 0) // 0-2
        this.fadeAlpha = Math.max(0.05, Math.min(0.7, controls.feedbackFade / 100))
    }

    protected async loadResources(): Promise<void> {
        // Create feedback buffer
        this.createOrResizeFeedback()
    }

    // Override base render to implement feedback/fade instead of full clear
    protected render(time: number): void {
        if (!this.ctx || !this.canvas) return

        // Delta time
        if (this.lastFrameTime === 0) {
            this.deltaTime = 0
            // Ensure a solid black base on first frame to avoid white flash
            this.ctx.save()
            this.ctx.globalCompositeOperation = 'source-over'
            this.ctx.globalAlpha = 1
            this.ctx.fillStyle = 'rgba(0, 0, 0, 1)'
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
            this.ctx.restore()
        } else {
            this.deltaTime = time - this.lastFrameTime
        }
        this.lastFrameTime = time

        // Ensure feedback buffer matches canvas size
        this.createOrResizeFeedback()

        // Fade existing frame for motion trails (stronger fade to prevent white-out)
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'source-over'
        const fade = this.fadeAlpha
        this.ctx.fillStyle = `rgba(0, 0, 0, ${fade})`
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.restore()

        // Draw echoes from previous frame buffer
        if (this.feedbackCanvas) {
            const cx = this.canvas.width / 2
            const cy = this.canvas.height / 2

            this.ctx.save()
            // Use multiply to suppress white stacking; more filmic echo
            this.ctx.globalCompositeOperation = 'multiply'

            for (let i = 1; i <= this.echoCount; i++) {
                const alpha = this.echoAlpha * 0.18 * (1 - i / (this.echoCount + 1))
                const angle = this.echoRotationRad * i
                const dx = this.echoOffsetPx * i
                const dy = this.echoOffsetPx * 0.6 * i

                this.ctx.save()
                this.ctx.translate(cx, cy)
                this.ctx.rotate(angle)
                const scale = 1 + 0.003 * i
                this.ctx.scale(scale, scale)
                this.ctx.translate(-cx + dx, -cy + dy)
                this.ctx.globalAlpha = alpha
                this.ctx.drawImage(this.feedbackCanvas, 0, 0)
                this.ctx.restore()
            }

            this.ctx.restore()
        }

        // Draw current motif (arcs around a rotating field)
        this.draw(time, this.deltaTime)

        // Update feedback buffer with current frame
        if (this.feedbackCtx && this.canvas) {
            this.feedbackCtx.globalCompositeOperation = 'source-over'
            this.feedbackCtx.globalAlpha = 1
            this.feedbackCtx.drawImage(this.canvas, 0, 0)
        }
    }

    protected draw(time: number, _deltaTime: number): void {
        if (!this.ctx || !this.canvas) return

        const ctx = this.ctx
        const w = this.canvas.width
        const h = this.canvas.height
        const cx = w / 2
        const cy = h / 2

        // Base parameters
        const baseRadius = Math.min(w, h) * 0.32
        const t = time * this.normalizedSpeed

        // Render shimmering arcs
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        for (let i = 0; i < this.motifCount; i++) {
            const p = i / this.motifCount
            const angle = p * Math.PI * 2 + t * 0.6
            const radius = baseRadius * (0.75 + 0.25 * Math.sin(t * 1.3 + i * 0.7))

            // Arc endpoints
            const ax = cx + Math.cos(angle) * radius
            const ay = cy + Math.sin(angle) * radius
            const arcLen = 0.18 + 0.08 * Math.sin(t * 2.0 + i)
            const start = angle - arcLen * 0.5
            const end = angle + arcLen * 0.5

            // Color
            const hue = (360 * (p + t * 0.05 * this.hueSpeed)) % 360
            const sat = Math.min(100, 60 * this.saturationFactor)
            const light = Math.min(90, 40 * this.intensityFactor)
            ctx.strokeStyle = `hsl(${hue}, ${sat}%, ${light}%)`
            ctx.lineWidth = 1.1 + 0.5 * Math.sin(i + t * 1.7)
            const a = 0.28 + 0.28 * Math.sin(t * 2 + i * 0.5)
            ctx.globalAlpha = Math.max(0.18, Math.min(0.6, a))

            // Draw arc around (ax, ay)
            ctx.beginPath()
            ctx.arc(ax, ay, 14 + 6 * Math.sin(t * 1.2 + i), start, end)
            ctx.stroke()
        }

        ctx.restore()
    }

    protected applyCanvasSizingFromElement(): void {
        // Helper if we later want to react to DPI/resize
        this.createOrResizeFeedback()
    }

    protected updateParameters(controls: TemporalHallucinationControls): void {
        this.applyControls(controls)
    }

    private createOrResizeFeedback(): void {
        if (!this.canvas) return
        if (!this.feedbackCanvas) {
            this.feedbackCanvas = document.createElement('canvas')
            this.feedbackCtx = this.feedbackCanvas.getContext('2d')
            if (!this.feedbackCtx) {
                this.feedbackCanvas = null
                return
            }
        }

        if (this.feedbackCanvas.width !== this.canvas.width || this.feedbackCanvas.height !== this.canvas.height) {
            this.feedbackCanvas.width = this.canvas.width
            this.feedbackCanvas.height = this.canvas.height
            // Clear buffer
            if (this.feedbackCtx) {
                this.feedbackCtx.fillStyle = 'rgba(0,0,0,1)'
                this.feedbackCtx.fillRect(0, 0, this.feedbackCanvas.width, this.feedbackCanvas.height)
            }
        }
    }
}

// Create and initialize effect
const effect = new TemporalHallucinationEffect()
initializeEffect(() => effect.initialize())

export default effect
