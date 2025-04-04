/**
 * GlowParticles - A colorful particle system with glowing effects
 * Uses Canvas 2D rendering for beautiful, smooth particles
 */
import { CanvasEffect } from "../../common/canvas-effect";
import {
  normalizeSpeed,
  normalizePercentage,
  boolToInt,
  getControlValue,
  comboboxValueToIndex,
} from "../../common/controls";
import { initializeEffect } from "../../common";

// Define control interface
export interface GlowParticlesControls {
  speed: number;
  particleCount: number;
  particleSize: number;
  glowIntensity: number;
  colorMode: number;
  flowDirection: number;
  connectParticles: boolean;
  particleBounce: boolean;
  colorSaturation: number;
  colorIntensity: number;
}

// Color modes
const COLOR_MODES = [
  "Rainbow",
  "Heat Map",
  "Neon",
  "Cyberpunk",
  "Pastel",
  "Ocean",
  "Fire and Ice",
];

// Flow directions
const FLOW_DIRECTIONS = [
  "Outward",
  "Circular",
  "Left to Right",
  "Right to Left",
  "Top to Bottom",
  "Bottom to Top",
  "Random",
];

/**
 * Particle class to represent a single particle
 */
class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number = 0;
  speedY: number = 0;
  color: string;
  alpha: number;
  angle: number;
  angleSpeed: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    size: number,
    speedFactor: number,
    flowDirection: number,
  ) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * size + 1;

    // Set speed based on flow direction
    this.setSpeedByDirection(
      canvasWidth,
      canvasHeight,
      speedFactor,
      flowDirection,
    );

    this.color = "hsl(0, 100%, 50%)"; // Initial color, will be updated
    this.alpha = Math.random() * 0.5 + 0.5; // Random alpha for depth
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = Math.random() * 0.1 - 0.05;
  }

  /**
   * Set particle speed based on flow direction
   */
  setSpeedByDirection(
    canvasWidth: number,
    canvasHeight: number,
    speedFactor: number,
    flowDirection: number,
  ): void {
    const baseSpeed = (1 + Math.random()) * speedFactor;

    switch (flowDirection) {
      case 0: // Outward
        const center = {
          x: canvasWidth / 2,
          y: canvasHeight / 2,
        };
        const angle = Math.atan2(this.y - center.y, this.x - center.x);
        this.speedX = Math.cos(angle) * baseSpeed;
        this.speedY = Math.sin(angle) * baseSpeed;
        break;

      case 1: // Circular
        this.angle = Math.random() * Math.PI * 2;
        this.speedX = Math.cos(this.angle) * baseSpeed;
        this.speedY = Math.sin(this.angle) * baseSpeed;
        this.angleSpeed = (Math.random() * 0.2 - 0.1) * speedFactor;
        break;

      case 2: // Left to Right
        this.speedX = baseSpeed;
        this.speedY = (Math.random() * 2 - 1) * 0.5;
        break;

      case 3: // Right to Left
        this.speedX = -baseSpeed;
        this.speedY = (Math.random() * 2 - 1) * 0.5;
        break;

      case 4: // Top to Bottom
        this.speedX = (Math.random() * 2 - 1) * 0.5;
        this.speedY = baseSpeed;
        break;

      case 5: // Bottom to Top
        this.speedX = (Math.random() * 2 - 1) * 0.5;
        this.speedY = -baseSpeed;
        break;

      case 6: // Random
      default:
        this.speedX = (Math.random() * 2 - 1) * baseSpeed;
        this.speedY = (Math.random() * 2 - 1) * baseSpeed;
    }
  }

  /**
   * Update particle position and handle bouncing or wrapping
   */
  update(
    canvasWidth: number,
    canvasHeight: number,
    deltaTime: number,
    bounce: boolean,
  ): void {
    // Update position
    this.x += this.speedX * deltaTime * 60;
    this.y += this.speedY * deltaTime * 60;

    // Handle circular movement
    if (this.angleSpeed !== 0) {
      this.angle += this.angleSpeed * deltaTime * 60;
      this.speedX =
        (Math.cos(this.angle) * Math.abs(this.speedX + this.speedY)) / 2;
      this.speedY =
        (Math.sin(this.angle) * Math.abs(this.speedX + this.speedY)) / 2;
    }

    // Handle edge collision
    if (bounce) {
      // Bounce off edges
      if (this.x <= 0 || this.x >= canvasWidth) {
        this.speedX *= -1;
        this.x = Math.max(0, Math.min(this.x, canvasWidth));
      }

      if (this.y <= 0 || this.y >= canvasHeight) {
        this.speedY *= -1;
        this.y = Math.max(0, Math.min(this.y, canvasHeight));
      }
    } else {
      // Wrap around edges
      if (this.x < 0) this.x = canvasWidth;
      if (this.x > canvasWidth) this.x = 0;
      if (this.y < 0) this.y = canvasHeight;
      if (this.y > canvasHeight) this.y = 0;
    }
  }

  /**
   * Set particle color based on color mode and modifiers
   */
  setColor(
    colorMode: number,
    time: number,
    saturation: number,
    intensity: number,
  ): void {
    let hue: number;
    let sat: number;
    let light: number;

    switch (colorMode) {
      case 0: // Rainbow
        hue = (time * 30 + this.x + this.y) % 360;
        sat = saturation;
        light = 50 + (intensity - 100) / 4;
        break;

      case 1: // Heat Map
        hue = ((this.x + this.y) / 5 + time * 20) % 100;
        hue = hue < 50 ? hue * 3 : (100 - hue) * 6; // 0-150 red-yellow, 150-300 yellow-orange
        sat = saturation;
        light = 45 + (intensity - 100) / 4;
        break;

      case 2: // Neon
        const neonColors = [320, 260, 180, 120, 200]; // Pink, Purple, Cyan, Green, Blue
        const index =
          Math.floor(time + this.x / 100 + this.y / 100) % neonColors.length;
        hue = neonColors[index];
        sat = saturation;
        light = 60 + (intensity - 100) / 4;
        break;

      case 3: // Cyberpunk
        const cyberColors = [320, 195, 270, 170]; // Pink, Teal, Purple, Green
        hue =
          cyberColors[
            Math.floor((this.x + this.y + time * 100) / 100) %
              cyberColors.length
          ];
        sat = saturation;
        light = 55 + (intensity - 100) / 4;
        break;

      case 4: // Pastel
        hue = (time * 20 + this.x + this.y) % 360;
        sat = saturation * 0.6; // Reduce saturation for pastel
        light = 75 + (intensity - 100) / 8; // Higher lightness for pastel
        break;

      case 5: // Ocean
        hue = 180 + Math.sin(time + this.x / 100) * 30; // Range around cyan/blue
        sat = saturation;
        light =
          40 + Math.sin(time * 2 + this.y / 50) * 20 + (intensity - 100) / 5;
        break;

      case 6: // Fire and Ice
        if (this.y < this.x) {
          // Fire in top-right, ice in bottom-left
          hue = 10 + Math.sin(time + this.y / 50) * 20; // Fire: red-orange
          sat = saturation;
          light = 50 + Math.sin(time * 3) * 10 + (intensity - 100) / 5;
        } else {
          hue = 200 + Math.sin(time - this.x / 100) * 20; // Ice: blue
          sat = saturation * 0.8;
          light = 60 + Math.sin(time * 2) * 10 + (intensity - 100) / 5;
        }
        break;

      default:
        hue = (time * 50) % 360;
        sat = saturation;
        light = 50 + (intensity - 100) / 4;
    }

    // Apply saturation scaling (0-200%)
    sat = Math.min(100, sat);

    // Apply lightness/intensity scaling
    light = Math.max(20, Math.min(80, light));

    this.color = `hsl(${hue}, ${sat}%, ${light}%)`;
  }
}

/**
 * GlowParticles effect implementation using Canvas 2D
 */
export class GlowParticlesEffect extends CanvasEffect<GlowParticlesControls> {
  // Effect state
  private particles: Particle[] = [];
  private currentControls: GlowParticlesControls | null = null;

  constructor() {
    super({
      id: "glow-particles",
      name: "GlowParticles",
      debug: true,
      backgroundColor: "rgba(0, 0, 0, 0.98)", // Slight transparency for motion blur
    });
  }

  /**
   * Initialize the controls and their default values
   */
  protected initializeControls(): void {
    // Set default values to make them available globally for SignalRGB
    window.speed = 5;
    window.particleCount = 100;
    window.particleSize = 4;
    window.glowIntensity = 100;
    window.colorMode = "Rainbow";
    window.flowDirection = "Outward";
    window.connectParticles = 1;
    window.particleBounce = 1;
    window.colorSaturation = 100;
    window.colorIntensity = 100;
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): GlowParticlesControls {
    return {
      speed: normalizeSpeed(getControlValue<number>("speed", 5)),
      particleCount: getControlValue<number>("particleCount", 100),
      particleSize: getControlValue<number>("particleSize", 4),
      glowIntensity: normalizePercentage(
        getControlValue<number>("glowIntensity", 100),
      ),
      colorMode: comboboxValueToIndex(
        getControlValue<string | number>("colorMode", "Rainbow"),
        COLOR_MODES,
        0,
      ),
      flowDirection: comboboxValueToIndex(
        getControlValue<string | number>("flowDirection", "Outward"),
        FLOW_DIRECTIONS,
        0,
      ),
      connectParticles: Boolean(
        boolToInt(getControlValue<boolean | number>("connectParticles", 1)),
      ),
      particleBounce: Boolean(
        boolToInt(getControlValue<boolean | number>("particleBounce", 1)),
      ),
      colorSaturation:
        normalizePercentage(
          getControlValue<number>("colorSaturation", 100),
          100,
          0,
        ) * 100,
      colorIntensity:
        normalizePercentage(
          getControlValue<number>("colorIntensity", 100),
          100,
          0,
        ) * 100,
    };
  }

  /**
   * Apply control values to the effect parameters
   */
  protected applyControls(controls: GlowParticlesControls): void {
    this.currentControls = controls;

    // Recreate particles if particle count changed
    if (
      !this.particles.length ||
      this.particles.length !== controls.particleCount
    ) {
      this.createParticles();
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

    this.particles = [];

    for (let i = 0; i < this.currentControls.particleCount; i++) {
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
  }

  /**
   * Draw the particles on the canvas
   */
  protected draw(time: number, deltaTime: number): void {
    if (!this.ctx || !this.canvas || !this.currentControls) return;

    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const controls = this.currentControls;

    // If particles not created yet, create them
    if (this.particles.length === 0) {
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
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, controls.glowIntensity * 0.2)})`;
      ctx.lineWidth = Math.max(0.5, controls.particleSize / 6);

      const connectionDistance = Math.min(100, width / 3);

      for (let i = 0; i < this.particles.length; i++) {
        const p1 = this.particles[i];

        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            // Draw line with opacity based on distance
            const opacity = 1 - distance / connectionDistance;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.15 * controls.glowIntensity})`;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }

    // Second pass - draw particles
    for (const particle of this.particles) {
      // Update particle
      particle.update(
        width,
        height,
        deltaTime * controls.speed,
        controls.particleBounce,
      );

      // Update color based on time and position
      particle.setColor(
        controls.colorMode,
        time,
        controls.colorSaturation,
        controls.colorIntensity,
      );

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
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over";
  }
}

// Create effect instance
const effect = new GlowParticlesEffect();

// Initialize the effect using the common initializer for SignalRGB
initializeEffect(() => {
  console.log("[GlowParticles] Initializing through common initializer");
  effect.initialize();
});

// Export the effect instance
export default effect;
