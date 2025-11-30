/**
 * GlowParticles - Physics-Based Particle System
 * Real forces: gravity, attraction/repulsion, turbulence, vortex
 */

import { BooleanControl, ComboboxControl, Effect, NumberControl } from '../../core/controls/decorators'
import { boolToInt, normalizePercentage } from '../../core/controls/helpers'
import { CanvasEffect } from '../../core/effects/canvas-effect'
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
            chaos: Number(window.chaos ?? 6),
            clustering: Number(window.clustering ?? 5),
            colorMode,
            connectionDistance: Number(window.connectionDistance ?? 100),
            connectorGlow: Number(window.connectorGlow ?? 80) / 100,
            connectParticles: Boolean(boolToInt(window.connectParticles ?? 1)),
            glowIntensity: normalizePercentage(window.glowIntensity ?? 80),
            networkActivity: Number(window.networkActivity ?? 6) / 10,
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
     * Apply all physics forces to particles
     * Derives internal physics from simplified controls
     */
    private applyForces(controls: GlowParticlesControls): void {
        if (!this.canvas) return

        const { width, height } = this.canvas

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
                // Large scale flow - sweeping currents
                const scale1 = 0.003
                const nx1 = noise2D(p.x * scale1, p.y * scale1, this.noiseTime * 0.8)
                const ny1 = noise2D(p.x * scale1 + 100, p.y * scale1 + 100, this.noiseTime * 0.8)

                // Medium scale - local swirls
                const scale2 = 0.012
                const nx2 = noise2D(p.x * scale2 + p.id * 0.1, p.y * scale2, this.noiseTime * 1.5)
                const ny2 = noise2D(p.x * scale2 + 50, p.y * scale2 + p.id * 0.1, this.noiseTime * 1.5)

                // Small scale - individual jitter
                const scale3 = 0.04
                const nx3 = noise2D(p.x * scale3 + p.phase, p.y * scale3, this.noiseTime * 3)
                const ny3 = noise2D(p.x * scale3, p.y * scale3 + p.phase, this.noiseTime * 3)

                const tForce = turbulence * 0.035
                p.applyForce(
                    (nx1 * 0.5 + nx2 * 0.35 + nx3 * 0.15) * tForce,
                    (ny1 * 0.5 + ny2 * 0.35 + ny3 * 0.15) * tForce,
                )
            }

            // Gentle center bias to prevent edge clustering
            const edgePushX = (width / 2 - p.x) * 0.000015
            const edgePushY = (height / 2 - p.y) * 0.000015
            p.applyForce(edgePushX, edgePushY)
        }

        // ─────────────────────────────────────────────────────────
        // ATTRACTION/REPULSION with charge influence
        // ─────────────────────────────────────────────────────────
        if (attraction > 0 || chargeWeight > 0) {
            const aForce = attraction * 0.001

            for (let i = 0; i < this.particles.length; i++) {
                const p1 = this.particles[i]

                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j]
                    const dx = p2.x - p1.x
                    const dy = p2.y - p1.y
                    const distSq = dx * dx + dy * dy

                    if (distSq > 200 && distSq < 30000) {
                        const dist = Math.sqrt(distSq)

                        // Base attraction with falloff
                        let force = aForce / (distSq * 0.001 + 1)

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
        const friction = Math.max(0.05, (10 - controls.chaos) * 0.04) // More chaos = less friction
        const colorReactivity = 0.4 + controls.networkActivity * 0.5

        if (this.particles.length === 0) {
            this.createParticles()
        }

        // Clear with subtle trail
        ctx.fillStyle = 'rgba(5, 5, 15, 0.15)'
        ctx.fillRect(0, 0, width, height)

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

        // Draw particles - simple and clean
        ctx.globalCompositeOperation = 'lighter'

        for (const p of this.particles) {
            const pulseScale = 1 + p.pulseEnergy * 0.25
            const glowSize = p.size * pulseScale * (1 + controls.glowIntensity * 1.2)

            // Glow
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize)
            gradient.addColorStop(0, p.color)
            gradient.addColorStop(0.4, p.color.replace(')', ', 0.5)').replace('hsl', 'hsla'))
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

            ctx.beginPath()
            ctx.fillStyle = gradient
            ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
            ctx.fill()

            // Core
            const coreSize = p.size * pulseScale * 0.35
            ctx.beginPath()
            ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + p.pulseEnergy * 0.4})`
            ctx.arc(p.x, p.y, coreSize, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.globalCompositeOperation = 'source-over'
    }
}
