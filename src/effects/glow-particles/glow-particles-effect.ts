/**
 * GlowParticles - Main Effect Class
 * Implements the GlowParticles effect
 */
import { CanvasEffect } from "../../common/canvas-effect";
import { Particle } from "./particle";
import { GlowParticlesControls } from "./types";
import {
  Effect,
  NumberControl,
  BooleanControl,
  ComboboxControl,
} from "../../common/control-decorators";
import { normalizePercentage, boolToInt } from "../../common/controls";
import { COLOR_MODES, FLOW_DIRECTIONS } from "./types";

// Interface with window properties for type-safety
declare global {
  interface Window {
    speed: number;
    particleCount: number;
    particleSize: number;
    glowIntensity: number;
    colorMode: string | number;
    flowDirection: string | number;
    connectParticles: boolean | number;
    particleBounce: boolean | number;
    colorSaturation: number;
    colorIntensity: number;
    connectorGlow: number;
  }
}

/**
 * GlowParticles effect implementation using Canvas 2D
 */
@Effect({
  name: "Glow Particles",
  description:
    "A colorful particle system with glowing effects using Canvas 2D",
  author: "hyperb1iss",
})
export class GlowParticlesEffect extends CanvasEffect<GlowParticlesControls> {
  // Effect state
  private particles: Particle[] = [];
  private currentControls: GlowParticlesControls | null = null;
  private lastParticleSize: number = 0;

  @NumberControl({
    label: "Animation Speed",
    min: 1,
    max: 10,
    default: 3,
    tooltip: "Controls the speed of the particles (1=Slow, 10=Fast)",
  })
  speed!: number;

  @NumberControl({
    label: "Particle Count",
    min: 10,
    max: 300,
    default: 100,
    tooltip: "Number of particles to display",
  })
  particleCount!: number;

  @NumberControl({
    label: "Particle Size",
    min: 1,
    max: 40,
    default: 20,
    tooltip: "Size of particles",
  })
  particleSize!: number;

  @NumberControl({
    label: "Glow Intensity",
    min: 1,
    max: 200,
    default: 100,
    tooltip: "Controls the intensity of the glow effect",
  })
  glowIntensity!: number;

  @ComboboxControl({
    label: "Color Mode",
    values: COLOR_MODES,
    default: "Rainbow",
    tooltip: "Color palette for particles",
  })
  colorMode!: string;

  @ComboboxControl({
    label: "Flow Direction",
    values: FLOW_DIRECTIONS,
    default: "Outward",
    tooltip: "Primary direction of particle movement",
  })
  flowDirection!: string;

  @BooleanControl({
    label: "Connect Particles",
    default: true,
    tooltip: "Draw lines between nearby particles",
  })
  connectParticles!: boolean;

  @NumberControl({
    label: "Connector Intensity",
    min: 1,
    max: 200,
    default: 100,
    tooltip: "Controls the intensity and thickness of particle connections",
  })
  connectorGlow!: number;

  @BooleanControl({
    label: "Bounce Off Edges",
    default: true,
    tooltip: "Particles bounce off edges instead of wrapping around",
  })
  particleBounce!: boolean;

  @NumberControl({
    label: "Color Saturation",
    min: 1,
    max: 200,
    default: 100,
    tooltip: "Adjust color saturation level (100=Normal)",
  })
  colorSaturation!: number;

  @NumberControl({
    label: "Color Intensity",
    min: 1,
    max: 200,
    default: 100,
    tooltip: "Adjust color intensity/brightness (100=Normal)",
  })
  colorIntensity!: number;

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
    // Set default values to make them available globally for SignalRGB
    window.speed = 3;
    window.particleCount = 100;
    window.particleSize = 20;
    window.glowIntensity = 100;
    window.colorMode = "Rainbow";
    window.flowDirection = "Outward";
    window.connectParticles = 1;
    window.particleBounce = 1;
    window.colorSaturation = 100;
    window.colorIntensity = 100;
    window.connectorGlow = 100;
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): GlowParticlesControls {
    // Create a speed scale that varies from 0.5 to 3.0 based on control value (1-10)
    // This gives a better range for visible speed differences
    const rawSpeed = window.speed ?? 3;
    const smoothSpeed = 0.5 + (rawSpeed - 1) * 0.28;

    // Get colorMode as index for shader
    let colorMode: number;
    if (typeof window.colorMode === "string") {
      const modeIndex = COLOR_MODES.indexOf(window.colorMode);
      colorMode = modeIndex === -1 ? 9 : modeIndex; // Default to Rainbow (index 9)
    } else {
      colorMode = Number(window.colorMode || 9);
    }

    // Get flowDirection as index
    let flowDirection: number;
    if (typeof window.flowDirection === "string") {
      const directionIndex = FLOW_DIRECTIONS.indexOf(window.flowDirection);
      flowDirection = directionIndex === -1 ? 0 : directionIndex;
    } else {
      flowDirection = Number(window.flowDirection || 0);
    }

    return {
      speed: smoothSpeed,
      particleCount: Number(window.particleCount ?? 100),
      particleSize: Number(window.particleSize ?? 20),
      glowIntensity: normalizePercentage(window.glowIntensity ?? 100),
      colorMode,
      flowDirection,
      connectParticles: Boolean(boolToInt(window.connectParticles ?? 1)),
      particleBounce: Boolean(boolToInt(window.particleBounce ?? 1)),
      colorSaturation: normalizePercentage(window.colorSaturation ?? 100) * 100,
      colorIntensity: normalizePercentage(window.colorIntensity ?? 100) * 100,
      connectorGlow: normalizePercentage(window.connectorGlow ?? 100) * 100,
    };
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
