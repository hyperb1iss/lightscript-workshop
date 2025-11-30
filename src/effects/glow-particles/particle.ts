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
     */
    setColor(colorMode: number, time: number, saturation: number, intensity: number, colorReactivity: number): void {
        const t = time * 0.3
        // Combine kinetic energy with pulse energy for color reactivity
        const totalEnergy = this.energy + this.pulseEnergy * 0.5
        const energyBoost = totalEnergy * colorReactivity * 20

        let hue: number
        let sat: number
        let light: number

        switch (colorMode) {
            case 0: // Plasma
                // Swirling plasma based on position and velocity
                hue = (this.x * 0.5 + this.y * 0.3 + t * 50 + this.getAngle() * 30 + energyBoost * 2) % 360
                sat = Math.min(100, saturation + energyBoost * 5)
                light = 50 + Math.sin(t + this.phase) * 10 + Math.min(20, energyBoost * 3)
                break

            case 1: // Velocity Rainbow
                // Color based on velocity direction
                hue = ((this.getAngle() * 180) / Math.PI + 180 + t * 20) % 360
                sat = Math.min(100, 70 + this.energy * 30)
                light = 45 + Math.min(30, energyBoost * 4)
                break

            case 2: // Fire
                // Hot colors that intensify with speed
                hue = 20 + Math.max(-20, Math.min(30, this.energy * 50 - 10))
                sat = Math.min(100, saturation + 20)
                light = 40 + Math.min(35, energyBoost * 5) + Math.sin(t * 3 + this.phase) * 5
                break

            case 3: // Electric
                // Cyan/blue with white hot spots at high energy
                hue = 190 + Math.sin(t + this.phase) * 20
                sat = Math.max(20, saturation - energyBoost * 10)
                light = 50 + Math.min(40, energyBoost * 6)
                break

            case 4: // Toxic
                // Greens and yellows
                hue = 80 + Math.sin(t * 0.5 + this.x * 0.01) * 40 + energyBoost
                sat = saturation
                light = 45 + Math.sin(t * 2 + this.phase) * 10 + Math.min(20, energyBoost * 3)
                break

            case 5: // Nebula
                // Deep space purples and pinks
                hue = 270 + Math.sin(t * 0.3 + this.phase) * 40 + this.energy * 20
                sat = Math.min(100, saturation * 0.8 + 20)
                light = 35 + Math.sin(this.x * 0.02 + this.y * 0.02 + t) * 15 + Math.min(25, energyBoost * 3)
                break

            case 6: // Ocean
                // Blues and teals with foam (white) at high energy
                hue = 200 + Math.sin(t + this.y * 0.01) * 30
                sat = Math.max(30, saturation - energyBoost * 8)
                light = 40 + Math.sin(t * 1.5 + this.phase) * 10 + Math.min(35, energyBoost * 5)
                break

            case 7: {
                // Sunset
                // Warm gradient based on Y position
                const yRatio = this.y / 200 // Assuming ~200px height
                hue = 30 - yRatio * 40 + Math.sin(t * 0.5) * 10
                sat = Math.min(100, saturation + 10)
                light = 55 - yRatio * 15 + Math.min(15, energyBoost * 2)
                break
            }

            case 8: {
                // Northern Lights
                // Flowing aurora colors
                const wave = Math.sin(this.x * 0.02 + t) * Math.cos(this.y * 0.01 + t * 0.5)
                hue = 120 + wave * 60 + this.energy * 30
                sat = Math.min(100, 70 + Math.abs(wave) * 30)
                light = 45 + wave * 15 + Math.min(20, energyBoost * 3)
                break
            }

            case 9: {
                // Cyberpunk
                // Flowing pink/cyan/purple based on position and connections
                // Creates gradient across the network topology
                const cyberWave = Math.sin(this.x * 0.008 + this.y * 0.005 + t * 0.3) * 0.5 + 0.5
                // Blend between cyan (180), pink (320), purple (270)
                hue =
                    cyberWave < 0.33
                        ? 180 + cyberWave * 3 * 90 // cyan to purple
                        : cyberWave < 0.66
                          ? 270 + (cyberWave - 0.33) * 3 * 50 // purple to pink
                          : 320 - (cyberWave - 0.66) * 3 * 140 // pink back to cyan
                hue += energyBoost * 0.5
                sat = Math.min(100, saturation + 15)
                light = 50 + Math.min(25, energyBoost * 3)
                break
            }

            case 10: // Monochrome Energy
                // White/gray that brightens with speed
                hue = 0
                sat = 0
                light = 30 + Math.min(60, energyBoost * 8 + this.energy * 40)
                break

            case 11: // Rainbow Cycle
                // Classic rainbow that cycles over time
                hue = (t * 30 + this.phase * 60 + this.id * 10) % 360
                sat = saturation
                light = 50 + Math.min(20, energyBoost * 3)
                break

            default:
                hue = (t * 50 + this.phase * 100) % 360
                sat = saturation
                light = 50
        }

        // Apply intensity adjustment
        light = Math.max(20, Math.min(85, light * (intensity / 100)))

        this.hue = hue
        this.alpha = 0.6 + Math.min(0.4, this.energy * 0.5)
        this.color = `hsl(${hue}, ${Math.min(100, sat)}%, ${light}%)`
    }
}
