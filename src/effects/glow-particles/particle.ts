/**
 * GlowParticles - Physics-Based Particle Class
 * Real physics: velocity, acceleration, forces, mass
 */

// Simple 2D vector helper
export interface Vec2 {
    x: number
    y: number
}

/**
 * Particle with real physics simulation and network behaviors
 */
export class Particle {
    // Position
    x: number
    y: number

    // Velocity
    vx = 0
    vy = 0

    // Accumulated forces (reset each frame)
    fx = 0
    fy = 0

    // Physical properties
    mass: number
    size: number
    baseSize: number

    // Visual properties
    color = 'hsl(0, 100%, 50%)'
    alpha = 1
    hue = 0
    energy = 0 // Tracks kinetic energy for color reactivity

    // Network properties
    charge: number // Positive or negative for complex interactions
    pulseEnergy = 0 // Energy received from connections (creates pulse waves)
    connectionCount = 0 // How many connections this frame
    hubStrength = 0 // Grows when highly connected (smoothed)
    lastPulseTime = 0 // When we last sent a pulse

    // Unique identity for variation
    id: number
    phase: number // Random phase offset for animations

    constructor(canvasWidth: number, canvasHeight: number, size: number, id: number) {
        this.id = id
        this.phase = Math.random() * Math.PI * 2

        // Random position
        this.x = Math.random() * canvasWidth
        this.y = Math.random() * canvasHeight

        // Size with variation (0.3 to 1.0 of base size)
        this.baseSize = 0.3 + Math.random() * 0.7
        this.size = this.baseSize * size

        // Mass proportional to size squared (area)
        this.mass = this.baseSize * this.baseSize

        // Charge: -1 to 1, determines attraction/repulsion behavior
        // More particles are neutral, fewer are strongly charged
        this.charge = (Math.random() - 0.5) * 2
        this.charge = Math.sign(this.charge) * Math.abs(this.charge) ** 2 // Bias toward neutral

        // Small initial random velocity
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 0.5
        this.vx = Math.cos(angle) * speed
        this.vy = Math.sin(angle) * speed
    }

    /**
     * Receive energy pulse from another particle
     */
    receivePulse(amount: number): void {
        this.pulseEnergy = Math.min(1, this.pulseEnergy + amount)
    }

    /**
     * Check if ready to send a pulse
     */
    canPulse(time: number): boolean {
        return this.pulseEnergy > 0.3 && time - this.lastPulseTime > 0.5
    }

    /**
     * Send pulse and mark time
     */
    sendPulse(time: number): number {
        const amount = this.pulseEnergy * 0.6
        this.pulseEnergy *= 0.3
        this.lastPulseTime = time
        return amount
    }

    /**
     * Apply a force to this particle (accumulated until update)
     */
    applyForce(fx: number, fy: number): void {
        // F = ma, so a = F/m
        this.fx += fx / this.mass
        this.fy += fy / this.mass
    }

    /**
     * Update physics simulation
     */
    update(canvasWidth: number, canvasHeight: number, dt: number, friction: number, bounce: boolean): void {
        // Apply accumulated forces to velocity
        this.vx += this.fx * dt
        this.vy += this.fy * dt

        // Apply friction (velocity damping)
        const frictionFactor = (1 - friction * 0.1) ** (dt * 60)
        this.vx *= frictionFactor
        this.vy *= frictionFactor

        // Update position
        this.x += this.vx * dt * 60
        this.y += this.vy * dt * 60

        // Calculate kinetic energy for visual effects
        this.energy = Math.sqrt(this.vx * this.vx + this.vy * this.vy)

        // Decay pulse energy over time
        this.pulseEnergy *= 0.97

        // Update hub strength based on connection count (smoothed)
        const targetHub = Math.min(1, this.connectionCount / 8)
        this.hubStrength += (targetHub - this.hubStrength) * 0.1

        // Reset connection count for next frame
        this.connectionCount = 0

        // Handle boundaries
        if (bounce) {
            // Bounce with energy loss
            if (this.x < 0) {
                this.x = 0
                this.vx *= -0.8
            } else if (this.x > canvasWidth) {
                this.x = canvasWidth
                this.vx *= -0.8
            }

            if (this.y < 0) {
                this.y = 0
                this.vy *= -0.8
            } else if (this.y > canvasHeight) {
                this.y = canvasHeight
                this.vy *= -0.8
            }
        } else {
            // Wrap around
            if (this.x < 0) this.x += canvasWidth
            if (this.x > canvasWidth) this.x -= canvasWidth
            if (this.y < 0) this.y += canvasHeight
            if (this.y > canvasHeight) this.y -= canvasHeight
        }

        // Reset forces for next frame
        this.fx = 0
        this.fy = 0
    }

    /**
     * Update particle size
     */
    updateSize(newSize: number): void {
        this.size = this.baseSize * newSize
    }

    /**
     * Get velocity magnitude
     */
    getSpeed(): number {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    }

    /**
     * Get velocity angle in radians
     */
    getAngle(): number {
        return Math.atan2(this.vy, this.vx)
    }

    /**
     * Set color based on mode, time, and particle state
     * Uses energy, pulse, hub strength, and connections for dynamic colors
     */
    setColor(colorMode: number, time: number, saturation: number, intensity: number, colorReactivity: number): void {
        const t = time * 0.5

        // Dynamic factors for color reactivity
        const speed = this.energy
        const pulse = this.pulseEnergy
        const hub = this.hubStrength
        const connected = Math.min(1, this.connectionCount / 5)

        // Combined energy for reactivity
        const energy = (speed + pulse * 2 + hub * 0.5) * colorReactivity

        let hue: number
        let sat: number
        let light: number

        switch (colorMode) {
            case 0: // Plasma - full spectrum swirl (saturated, medium light)
                hue = (this.x * 0.8 + this.y * 0.5 + t * 80 + this.getAngle() * 50 + pulse * 60) % 360
                sat = Math.min(100, 90 + energy * 10)
                light = 45 + pulse * 8 + Math.sin(t * 2 + this.phase) * 6
                break

            case 1: // Velocity Rainbow - direction = color (vivid)
                hue = ((this.getAngle() * 180) / Math.PI + 180 + t * 30) % 360
                sat = 100
                light = 50 + speed * 6 + pulse * 4
                break

            case 2: // Fire - deep orange to bright red (smooth gradient)
                hue = 5 + Math.max(0, Math.min(35, speed * 40)) + pulse * 8
                sat = Math.min(100, 95 + energy * 5)
                light = 45 + energy * 10 + Math.sin(t * 3 + this.phase) * 4
                break

            case 3: // Electric - cyan base with yellow energy sparks
                hue = 180 + Math.sin(t + this.phase) * 15 - energy * 80 - speed * 40
                sat = 100
                light = 48 + energy * 10 + connected * 5
                break

            case 4: // Toxic - vivid green/yellow, smooth magenta blend
                hue = 90 + Math.sin(t * 0.7 + this.x * 0.02) * 40 + pulse * 180
                sat = 100
                light = 45 + Math.sin(t * 2.5 + this.phase) * 6 + energy * 8
                break

            case 5: // Nebula - rich purple/pink/cyan
                hue = 280 + Math.sin(t * 0.4 + this.phase) * 50 + speed * 25 - hub * 15
                sat = Math.min(100, 85 + pulse * 15)
                light = 42 + Math.sin(this.x * 0.03 + this.y * 0.03 + t) * 8 + energy * 10
                break

            case 6: // Ocean - deep teal/blue (stays saturated)
                hue = 190 + Math.sin(t * 0.8 + this.y * 0.02) * 25 + speed * 12
                sat = Math.min(100, 85 + energy * 15)
                light = 40 + energy * 10 + connected * 4
                break

            case 7: {
                // Sunset - warm gradient with smooth purple shift for hubs
                const yNorm = this.y / 200
                hue = 30 - yNorm * 35 + Math.sin(t * 0.6) * 8 - hub * 45
                sat = 100
                light = 50 - yNorm * 8 + pulse * 6
                break
            }

            case 8: {
                // Northern Lights - vivid green/cyan/purple waves
                const wave = Math.sin(this.x * 0.03 + t * 1.2) * Math.cos(this.y * 0.02 + t * 0.7)
                hue = 140 + wave * 60 + speed * 30 + pulse * 40
                sat = 100
                light = 45 + wave * 8 + energy * 8
                break
            }

            case 9: {
                // Cyberpunk - smooth pink/cyan oscillation
                const cyberWave = Math.sin(this.x * 0.01 + this.y * 0.008 + t * 0.5 + this.phase)
                // Smoothly interpolate between cyan (190) and pink (320)
                hue = 255 + cyberWave * 65 + pulse * 15
                sat = 100
                light = 50 + energy * 8 + connected * 4
                break
            }

            case 10: // Monochrome Energy - cool grays with smooth blue tint
                hue = 210
                sat = Math.min(25, 8 + pulse * 25 + energy * 10)
                light = 40 + energy * 15 + connected * 6
                break

            case 11: // Rainbow Cycle - full saturation rainbow
                hue = (t * 50 + this.phase * 80 + this.id * 15 + pulse * 40) % 360
                sat = 100
                light = 50 + energy * 6
                break

            default:
                hue = (t * 60 + this.phase * 120) % 360
                sat = saturation
                light = 50
        }

        // Intensity adjustment - cap at 65 to prevent white washout
        light = Math.max(30, Math.min(65, light * (intensity / 100)))

        this.hue = hue
        this.alpha = 0.7 + Math.min(0.3, speed * 0.3 + pulse * 0.3)
        this.color = `hsl(${hue}, ${Math.min(100, sat)}%, ${light}%)`
    }
}
