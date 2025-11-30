/**
 * GlowParticles - Physics-Based Particle System
 * Real forces: gravity, attraction/repulsion, turbulence, vortex
 */

import {
    BooleanControl,
    boolToInt,
    CanvasEffect,
    ComboboxControl,
    Effect,
    NumberControl,
    normalizePercentage,
} from '@lightscript/core'
import { Particle } from './particle'
import { COLOR_MODES, GlowParticlesControls } from './types'

// Simplex-like noise for turbulence
function noise2D(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
}

// Interface with window properties for type-safety
declare global {
    interface Window {
        speed: number
        particleCount: number
        particleSize: number
        chaos: number
        clustering: number
        networkActivity: number
        glowIntensity: number
        colorMode: string | number
        connectParticles: boolean | number
        connectionDistance: number
        connectorGlow: number
        ambience: number
        nodeBrightness: number
        ambienceShift: number
    }
}

/**
 * Physics-based GlowParticles effect
 */
@Effect({
    author: 'hyperb1iss',
    description: 'Cyberpunk network visualization with physics-based nodes and reactive connections',
    name: 'Glow Particles',
})
export class GlowParticlesEffect extends CanvasEffect<GlowParticlesControls> {
    private particles: Particle[] = []
    private currentControls: GlowParticlesControls | null = null
    private noiseTime = 0

    // Background effect state
    private bgTime = 0
    private ambientHue = 0
    private ambientHueTarget = 0

    // ═══════════════════════════════════════════════════════════════
    // CORE CONTROLS - Keep it simple but powerful
    // ═══════════════════════════════════════════════════════════════

    @NumberControl({
        default: 7,
        label: 'Speed',
        max: 10,
        min: 1,
        tooltip: 'Simulation speed',
    })
    speed!: number

    @NumberControl({
        default: 120,
        label: 'Nodes',
        max: 300,
        min: 30,
        tooltip: 'Number of network nodes',
    })
    particleCount!: number

    @NumberControl({
        default: 5,
        label: 'Node Size',
        max: 20,
        min: 2,
        tooltip: 'Base node size',
    })
    particleSize!: number

    @NumberControl({
        default: 8,
        label: 'Chaos',
        max: 10,
        min: 0,
        tooltip: 'Motion intensity (0=calm flow, 10=wild chaos)',
    })
    chaos!: number

    @NumberControl({
        default: 4,
        label: 'Clustering',
        max: 10,
        min: 0,
        tooltip: 'How much nodes group together (0=spread, 10=tight clusters)',
    })
    clustering!: number

    @NumberControl({
        default: 8,
        label: 'Activity',
        max: 10,
        min: 0,
        tooltip: 'Network energy pulses (0=dormant, 10=hyperactive)',
    })
    networkActivity!: number

    @NumberControl({
        default: 70,
        label: 'Glow',
        max: 150,
        min: 20,
        tooltip: 'Overall glow intensity',
    })
    glowIntensity!: number

    @ComboboxControl({
        default: 'Cyberpunk',
        label: 'Color Mode',
        tooltip: 'Network color scheme',
        values: COLOR_MODES,
    })
    colorMode!: string

    @BooleanControl({
        default: true,
        label: 'Connections',
        tooltip: 'Show network links',
    })
    connectParticles!: boolean

    @NumberControl({
        default: 110,
        label: 'Link Distance',
        max: 200,
        min: 30,
        tooltip: 'Maximum connection range',
    })
    connectionDistance!: number

    @NumberControl({
        default: 90,
        label: 'Link Glow',
        max: 150,
        min: 20,
        tooltip: 'Connection brightness',
    })
    connectorGlow!: number

    @NumberControl({
        default: 60,
        label: 'Ambience',
        max: 100,
        min: 0,
        tooltip: 'Background nebula clouds and ambient glow (0=off)',
    })
    ambience!: number

    @NumberControl({
        default: 60,
        label: 'Node Brightness',
        max: 100,
        min: 10,
        tooltip: 'How bright/intense the nodes appear (lower = softer bokeh)',
    })
    nodeBrightness!: number

    @NumberControl({
        default: 0,
        label: 'Ambience Shift',
        max: 180,
        min: -180,
        tooltip: 'Shift background colors relative to particles (-180 to +180 degrees)',
    })
    ambienceShift!: number

    constructor() {
        super({
            backgroundColor: 'rgba(5, 5, 15, 0.95)',
            debug: false,
            id: 'glow-particles',
            name: 'GlowParticles',
        })
    }

    protected initializeControls(): void {
        window.speed = 7
        window.particleCount = 120
        window.particleSize = 5
        window.chaos = 8
        window.clustering = 4
        window.networkActivity = 8
        window.glowIntensity = 70
        window.colorMode = 'Cyberpunk'
        window.connectParticles = 1
        window.connectionDistance = 110
        window.connectorGlow = 90
        window.ambience = 60
        window.nodeBrightness = 60
        window.ambienceShift = 0
    }

    protected getControlValues(): GlowParticlesControls {
        let colorMode: number
        if (typeof window.colorMode === 'string') {
            const modeIndex = COLOR_MODES.indexOf(window.colorMode)
            colorMode = modeIndex === -1 ? 0 : modeIndex
        } else {
            colorMode = Number(window.colorMode || 0)
        }

        return {
            ambience: Number(window.ambience ?? 60) / 100,
            ambienceShift: Number(window.ambienceShift ?? 0),
            chaos: Number(window.chaos ?? 6),
            clustering: Number(window.clustering ?? 5),
            colorMode,
            connectionDistance: Number(window.connectionDistance ?? 100),
            connectorGlow: Number(window.connectorGlow ?? 80) / 100,
            connectParticles: Boolean(boolToInt(window.connectParticles ?? 1)),
            glowIntensity: normalizePercentage(window.glowIntensity ?? 80),
            networkActivity: Number(window.networkActivity ?? 6) / 10,
            nodeBrightness: Number(window.nodeBrightness ?? 60) / 100,
            particleCount: Number(window.particleCount ?? 100),
            particleSize: Number(window.particleSize ?? 6),
            speed: Number(window.speed ?? 5) / 5,
        }
    }

    protected applyControls(controls: GlowParticlesControls): void {
        const needsRecreate =
            !this.currentControls || !this.particles.length || this.particles.length !== controls.particleCount

        this.currentControls = controls

        if (needsRecreate) {
            this.createParticles()
        } else {
            // Update particle sizes
            for (const p of this.particles) {
                p.updateSize(controls.particleSize)
            }
        }
    }

    private createParticles(): void {
        if (!this.canvas || !this.currentControls) return

        const count = this.currentControls.particleCount
        const oldCount = this.particles.length

        if (count > oldCount) {
            for (let i = oldCount; i < count; i++) {
                this.particles.push(
                    new Particle(this.canvas.width, this.canvas.height, this.currentControls.particleSize, i),
                )
            }
        } else if (count < oldCount) {
            this.particles = this.particles.slice(0, count)
        } else if (oldCount === 0) {
            this.particles = []
            for (let i = 0; i < count; i++) {
                this.particles.push(
                    new Particle(this.canvas.width, this.canvas.height, this.currentControls.particleSize, i),
                )
            }
        }
    }

    /**
     * Draw clean ambient background - soft glow zones that follow particle clusters
     */
    private drawBackground(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        _time: number,
        controls: GlowParticlesControls,
    ): void {
        // Skip background if ambience is 0
        if (controls.ambience <= 0) return

        this.bgTime += 0.008

        const intensity = controls.ambience

        // Smoothly track average particle hue
        if (this.particles.length > 0) {
            let hueSum = 0
            for (const p of this.particles) {
                hueSum += p.hue
            }
            this.ambientHueTarget = hueSum / this.particles.length
        }
        this.ambientHue += (this.ambientHueTarget - this.ambientHue) * 0.02

        // Apply ambience shift
        const baseHue = (this.ambientHue + controls.ambienceShift + 360) % 360

        ctx.globalCompositeOperation = 'lighter'

        // ── Single cohesive ambient wash ──
        // One or two large, slow-moving color zones - not rainbow chaos
        const t = this.bgTime * 0.2

        // Primary ambient glow - follows a slow path
        const cx1 = width * (0.4 + 0.2 * Math.sin(t * 0.7))
        const cy1 = height * (0.4 + 0.2 * Math.cos(t * 0.5))
        const radius1 = Math.max(width, height) * 0.7

        const gradient1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, radius1)
        gradient1.addColorStop(0, `hsla(${baseHue}, 70%, 45%, ${0.12 * intensity})`)
        gradient1.addColorStop(0.5, `hsla(${baseHue}, 60%, 35%, ${0.06 * intensity})`)
        gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.fillStyle = gradient1
        ctx.fillRect(0, 0, width, height)

        // Secondary glow - complementary position
        const cx2 = width * (0.6 - 0.2 * Math.sin(t * 0.5))
        const cy2 = height * (0.6 - 0.2 * Math.cos(t * 0.7))
        const radius2 = Math.max(width, height) * 0.5

        const gradient2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, radius2)
        gradient2.addColorStop(0, `hsla(${(baseHue + 30) % 360}, 60%, 40%, ${0.08 * intensity})`)
        gradient2.addColorStop(0.6, `hsla(${(baseHue + 30) % 360}, 50%, 30%, ${0.03 * intensity})`)
        gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.fillStyle = gradient2
        ctx.fillRect(0, 0, width, height)

        // ── Cluster bloom - soft glow behind active particle groups ──
        if (this.particles.length > 10) {
            const hubs = this.particles.filter((p) => p.hubStrength > 0.3).slice(0, 3)

            for (const hub of hubs) {
                const glowSize = Math.min(width, height) * 0.3 * (0.5 + hub.hubStrength * 0.5)

                const gradient = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, glowSize)
                gradient.addColorStop(0, `hsla(${hub.hue}, 60%, 45%, ${0.08 * hub.hubStrength * intensity})`)
                gradient.addColorStop(0.6, `hsla(${hub.hue}, 50%, 35%, ${0.03 * hub.hubStrength * intensity})`)
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

                ctx.fillStyle = gradient
                ctx.beginPath()
                ctx.arc(hub.x, hub.y, glowSize, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        // ── Subtle vignette ──
        ctx.globalCompositeOperation = 'source-over'
        const vignetteGradient = ctx.createRadialGradient(
            width / 2,
            height / 2,
            Math.min(width, height) * 0.4,
            width / 2,
            height / 2,
            Math.max(width, height) * 0.85,
        )
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
        ctx.fillStyle = vignetteGradient
        ctx.fillRect(0, 0, width, height)
    }

    /**
     * Apply all physics forces to particles
     * Derives internal physics from simplified controls
     */
    private applyForces(controls: GlowParticlesControls): void {
        if (!this.canvas) return

        const { width, height } = this.canvas

        // Scale factor relative to reference canvas (800x600)
        // This ensures physics feel consistent across resolutions
        const refArea = 800 * 600
        const currentArea = width * height
        const areaScale = currentArea / refArea
        const linearScale = Math.sqrt(areaScale)

        // Derive physics from simplified controls
        const turbulence = controls.chaos * 1.2
        const attraction = controls.clustering * 0.6
        const chargeWeight = controls.clustering * 0.1

        // Update noise time - faster evolution
        this.noiseTime += controls.speed * 0.04

        for (const p of this.particles) {
            // ─────────────────────────────────────────────────────────
            // TURBULENCE - multi-scale noise for organic flow
            // ─────────────────────────────────────────────────────────
            if (turbulence > 0) {
                // Scale noise frequencies relative to canvas size
                const baseScale1 = 0.003 / linearScale
                const baseScale2 = 0.012 / linearScale
                const baseScale3 = 0.04 / linearScale

                // Large scale flow - sweeping currents
                const nx1 = noise2D(p.x * baseScale1, p.y * baseScale1, this.noiseTime * 0.8)
                const ny1 = noise2D(p.x * baseScale1 + 100, p.y * baseScale1 + 100, this.noiseTime * 0.8)

                // Medium scale - local swirls
                const nx2 = noise2D(p.x * baseScale2 + p.id * 0.1, p.y * baseScale2, this.noiseTime * 1.5)
                const ny2 = noise2D(p.x * baseScale2 + 50, p.y * baseScale2 + p.id * 0.1, this.noiseTime * 1.5)

                // Small scale - individual jitter
                const nx3 = noise2D(p.x * baseScale3 + p.phase, p.y * baseScale3, this.noiseTime * 3)
                const ny3 = noise2D(p.x * baseScale3, p.y * baseScale3 + p.phase, this.noiseTime * 3)

                // Turbulence force - less aggressive scaling to maintain energy at small sizes
                const tForce = turbulence * 0.035 * Math.max(0.6, linearScale)
                p.applyForce(
                    (nx1 * 0.5 + nx2 * 0.35 + nx3 * 0.15) * tForce,
                    (ny1 * 0.5 + ny2 * 0.35 + ny3 * 0.15) * tForce,
                )
            }

            // Gentle center bias to prevent edge clustering (scale-independent)
            const edgePushX = (width / 2 - p.x) * 0.000015
            const edgePushY = (height / 2 - p.y) * 0.000015
            p.applyForce(edgePushX, edgePushY)

            // Gentle base drift - provides motion when chaos is 0
            // Mix of orbital + random wandering so it's not perfectly circular
            const cx = width / 2
            const cy = height / 2
            const dx = p.x - cx
            const dy = p.y - cy
            const dist = Math.sqrt(dx * dx + dy * dy) + 1

            // Weak orbital component (per-particle direction based on charge)
            const orbitDir = p.charge > 0 ? 1 : -1
            const orbitForce = 0.02 * controls.speed * orbitDir

            // Random wander component using particle's phase
            const wanderAngle = p.phase + this.noiseTime * 0.5
            const wanderForce = 0.03 * controls.speed

            p.applyForce(
                (-dy / dist) * orbitForce + Math.cos(wanderAngle) * wanderForce,
                (dx / dist) * orbitForce + Math.sin(wanderAngle) * wanderForce,
            )
        }

        // ─────────────────────────────────────────────────────────
        // ATTRACTION/REPULSION with charge influence
        // ─────────────────────────────────────────────────────────
        if (attraction > 0 || chargeWeight > 0) {
            // Scale distance thresholds but keep force reasonable at small sizes
            const aForce = attraction * 0.001 * Math.max(0.4, areaScale)
            const minDistSq = 200 * areaScale
            const maxDistSq = 30000 * areaScale

            for (let i = 0; i < this.particles.length; i++) {
                const p1 = this.particles[i]

                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j]
                    const dx = p2.x - p1.x
                    const dy = p2.y - p1.y
                    const distSq = dx * dx + dy * dy

                    if (distSq > minDistSq && distSq < maxDistSq) {
                        const dist = Math.sqrt(distSq)

                        // Base attraction with falloff (scaled)
                        let force = aForce / ((distSq * 0.001) / areaScale + 1)

                        // Charge modification - opposite attract, same repel
                        const chargeProduct = p1.charge * p2.charge
                        force *= 1 - chargeProduct * chargeWeight

                        const fx = (dx / dist) * force
                        const fy = (dy / dist) * force

                        p1.applyForce(fx, fy)
                        p2.applyForce(-fx, -fy)
                    }
                }
            }
        }
    }

    protected draw(time: number, deltaTime: number): void {
        if (!this.ctx || !this.canvas || !this.currentControls) return

        const ctx = this.ctx
        const { width, height } = this.canvas
        const controls = this.currentControls
        const dt = Math.min(deltaTime, 0.05) * controls.speed

        // Derive internal values from simplified controls
        // Friction: more chaos = less friction, but cap max friction so base drift still works
        const friction = Math.min(0.2, Math.max(0.05, (10 - controls.chaos) * 0.03))
        const colorReactivity = 0.4 + controls.networkActivity * 0.5

        if (this.particles.length === 0) {
            this.createParticles()
        }

        // Clear with subtle trail
        ctx.fillStyle = 'rgba(5, 5, 15, 0.15)'
        ctx.fillRect(0, 0, width, height)

        // Draw background effects (nebula clouds, aurora waves, cluster glow)
        this.drawBackground(ctx, width, height, time, controls)

        // Network activity - inject energy pulses
        if (controls.networkActivity > 0 && Math.random() < controls.networkActivity * 0.15) {
            const randomParticle = this.particles[Math.floor(Math.random() * this.particles.length)]
            if (randomParticle) {
                randomParticle.receivePulse(0.6 + Math.random() * 0.4)
            }
        }

        // Apply physics
        this.applyForces(controls)

        // Update particles
        for (const p of this.particles) {
            p.update(width, height, dt, friction, true)
            p.setColor(controls.colorMode, time, 100, 100, colorReactivity)
        }

        // Draw connections
        if (controls.connectParticles) {
            ctx.globalCompositeOperation = 'lighter'
            const maxDist = controls.connectionDistance

            for (let i = 0; i < this.particles.length; i++) {
                const p1 = this.particles[i]

                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j]
                    const dx = p1.x - p2.x
                    const dy = p1.y - p2.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < maxDist) {
                        p1.connectionCount++
                        p2.connectionCount++

                        // Energy transfer
                        if (controls.networkActivity > 0) {
                            if (p1.canPulse(time) && p1.pulseEnergy > p2.pulseEnergy + 0.15) {
                                p2.receivePulse(p1.sendPulse(time) * 0.7)
                            } else if (p2.canPulse(time) && p2.pulseEnergy > p1.pulseEnergy + 0.15) {
                                p1.receivePulse(p2.sendPulse(time) * 0.7)
                            }
                        }

                        // Connection visuals
                        const distFactor = 1 - dist / maxDist
                        const pulseBoost = (p1.pulseEnergy + p2.pulseEnergy) * controls.networkActivity
                        const alpha = Math.min(0.8, distFactor * controls.connectorGlow * 0.5 + pulseBoost * 0.4)
                        const avgHue = (p1.hue + p2.hue) / 2

                        ctx.strokeStyle = `hsla(${avgHue}, ${65 + pulseBoost * 20}%, ${50 + pulseBoost * 25}%, ${alpha})`
                        ctx.lineWidth = Math.max(0.5, distFactor * 1.5 + pulseBoost * 1.5)
                        ctx.beginPath()
                        ctx.moveTo(p1.x, p1.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.stroke()
                    }
                }
            }
        }

        // Draw particles with controllable brightness
        ctx.globalCompositeOperation = 'lighter'

        const brightness = controls.nodeBrightness

        for (const p of this.particles) {
            const pulseScale = 1 + p.pulseEnergy * 0.25
            const glowSize = p.size * pulseScale * (1 + controls.glowIntensity * 1.2)

            const hue = p.hue

            // Main glow - controlled by brightness
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize)
            gradient.addColorStop(0, `hsla(${hue}, 90%, 55%, ${0.7 * brightness})`)
            gradient.addColorStop(0.3, `hsla(${hue}, 85%, 50%, ${0.4 * brightness})`)
            gradient.addColorStop(0.6, `hsla(${hue}, 80%, 45%, ${0.15 * brightness})`)
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

            ctx.beginPath()
            ctx.fillStyle = gradient
            ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
            ctx.fill()

            // Core - brighter center, also controlled by brightness
            const coreSize = p.size * pulseScale * 0.4
            const coreAlpha = (0.5 + p.pulseEnergy * 0.5) * brightness
            ctx.beginPath()
            ctx.fillStyle = `hsla(${hue}, 50%, 85%, ${coreAlpha})`
            ctx.arc(p.x, p.y, coreSize, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.globalCompositeOperation = 'source-over'
    }
}
