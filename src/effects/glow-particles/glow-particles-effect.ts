/**
 * GlowParticles - Main Effect Class
 * Implements the GlowParticles effect
 */
import { CanvasEffect } from "../../common/canvas-effect";
import { Particle } from "./particle";
import { GlowParticlesControls } from "./types";
import {
  getGlowParticlesControls,
  initializeGlowParticlesControls,
} from "./utils";

/**
 * GlowParticles effect implementation using Canvas 2D
 */
export class GlowParticlesEffect extends CanvasEffect<GlowParticlesControls> {
  // Effect state
  private particles: Particle[] = [];
  private currentControls: GlowParticlesControls | null = null;
  private lastParticleSize: number = 0;

  constructor() {
    super({
      id: "glow-particles",
      name: "GlowParticles",
      debug: true, // Enable debug mode
      backgroundColor: "rgba(0, 0, 0, 0.98)", // Slight transparency for motion blur
    });

    // Add direct console log to verify constructor is called
    console.log("👋 GlowParticlesEffect constructor called");
  }

  /**
   * Initialize the controls and their default values
   */
  protected initializeControls(): void {
    console.log("🎛️ Initializing controls");
    initializeGlowParticlesControls();
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): GlowParticlesControls {
    return getGlowParticlesControls();
  }

  /**
   * Apply control values to the effect parameters
   */
  protected applyControls(controls: GlowParticlesControls): void {
    // Check if essential properties changed that require recreating particles
    const needsRecreate =
      !this.currentControls ||
      !this.particles.length ||
      this.particles.length !== controls.particleCount ||
      this.currentControls.flowDirection !== controls.flowDirection;

    // Store new controls
    this.currentControls = controls;

    // Only recreate particles when necessary - this prevents jumpiness
    if (needsRecreate) {
      this.createParticles();
    } else if (this.lastParticleSize !== controls.particleSize) {
      // Update particle sizes without recreating them
      this.updateParticleSizes(controls.particleSize);
      this.lastParticleSize = controls.particleSize;
    }
  }

  /**
   * Update particle sizes without recreating them
   */
  private updateParticleSizes(newSize: number): void {
    for (const particle of this.particles) {
      particle.updateSize(newSize);
    }
  }

  /**
   * Create particles based on current settings
   */
  private createParticles(): void {
    if (!this.canvas || !this.currentControls) return;

    this.debug("info", "Creating particles", {
      count: this.currentControls.particleCount,
    });

    // Keep existing particles when possible to prevent all particles from "jumping"
    const oldParticleCount = this.particles.length;
    const newParticleCount = this.currentControls.particleCount;

    // Store the current particle size to track changes
    this.lastParticleSize = this.currentControls.particleSize;

    // Keep existing particles if just adding more or adjusting flow direction
    if (newParticleCount > oldParticleCount) {
      // Add more particles while keeping existing ones
      for (let i = oldParticleCount; i < newParticleCount; i++) {
        this.particles.push(
          new Particle(
            this.canvas.width,
            this.canvas.height,
            this.currentControls.particleSize,
            this.currentControls.speed,
            this.currentControls.flowDirection,
          ),
        );
      }
    } else if (newParticleCount < oldParticleCount) {
      // Remove excess particles
      this.particles = this.particles.slice(0, newParticleCount);
    } else if (oldParticleCount === 0) {
      // Create all new particles if none exist
      this.particles = [];
      for (let i = 0; i < newParticleCount; i++) {
        this.particles.push(
          new Particle(
            this.canvas.width,
            this.canvas.height,
            this.currentControls.particleSize,
            this.currentControls.speed,
            this.currentControls.flowDirection,
          ),
        );
      }
    } else {
      // Only update flow direction for existing particles
      for (const particle of this.particles) {
        particle.setSpeedByDirection(
          this.canvas.width,
          this.canvas.height,
          this.currentControls.speed,
          this.currentControls.flowDirection,
        );
      }
    }
  }

  /**
   * Draw the particles on the canvas
   */
  protected draw(time: number, deltaTime: number): void {
    if (!this.ctx || !this.canvas || !this.currentControls) {
      console.log("❌ Draw called but context, canvas or controls missing", {
        hasCtx: !!this.ctx,
        hasCanvas: !!this.canvas,
        hasControls: !!this.currentControls,
        deltaTime,
      });
      return;
    }

    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const controls = this.currentControls;

    // If particles not created yet, create them
    if (this.particles.length === 0) {
      console.log("🏗️ No particles found, creating them now");
      this.createParticles();
    }

    // Clear canvas with semi-transparent background for motion trail
    if (controls.glowIntensity > 1.2) {
      // Using a transparent black for motion blur effect
      ctx.fillStyle = `rgba(0, 0, 0, ${0.98 - (controls.glowIntensity - 1) * 0.05})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Regular clear
      this.clearCanvas();
    }

    // Update and draw particles
    ctx.globalCompositeOperation = "lighter"; // Additive blending for glow

    // First pass - draw connections if enabled
    if (controls.connectParticles) {
      // Set connector line thickness based on connector glow intensity, not particle size
      const connectorOpacity = Math.min(1, controls.connectorGlow * 0.004); // Doubled for stronger effect
      const connectorWidth = Math.max(0.5, controls.connectorGlow / 50); // Doubled for stronger effect

      ctx.strokeStyle = `rgba(255, 255, 255, ${connectorOpacity})`;
      ctx.lineWidth = connectorWidth;

      const connectionDistance = Math.min(120, width / 2.5); // Increased distance for more connections

      for (let i = 0; i < this.particles.length; i++) {
        const p1 = this.particles[i];

        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            // Draw line with opacity based on distance and connector glow
            const opacity =
              (1 - distance / connectionDistance) *
              0.3 *
              (controls.connectorGlow / 100); // Doubled opacity factor
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }

    // Second pass - draw particles
    for (const particle of this.particles) {
      // Update particle position with current speed
      particle.update(width, height, controls.speed, controls.particleBounce);

      // Update color based on time and position
      particle.setColor(
        controls.colorMode,
        time,
        controls.colorSaturation,
        controls.colorIntensity,
      );

      // Set blend mode for this particle
      ctx.globalCompositeOperation = particle.blendMode;

      // Draw glow effect
      const glowSize = particle.size * (1 + controls.glowIntensity);
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        glowSize,
      );

      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw particle core
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over";
  }
}
