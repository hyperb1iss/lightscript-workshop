/**
 * GlowParticles - Particle Class
 * Represents a single particle in the effect with its properties and behaviors
 */

/**
 * Particle class to represent a single particle
 */
export class Particle {
  x: number;
  y: number;
  size: number;
  baseSize: number; // Base size to maintain proportions
  speedX: number = 0;
  speedY: number = 0;
  color: string;
  alpha: number;
  angle: number;
  angleSpeed: number;
  colorOffset: number; // Random offset for color variations
  blendMode: GlobalCompositeOperation = "lighter"; // Default blend mode

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    size: number,
    speedFactor: number,
    flowDirection: number,
  ) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.baseSize = Math.random() * 0.8 + 0.2; // 0.2 to 1.0 range for size variation
    this.size = this.baseSize * size; // Apply size multiplier

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
    this.colorOffset = Math.random() * 360; // Random color offset
  }

  /**
   * Update particle size without changing position
   */
  updateSize(newSize: number): void {
    this.size = this.baseSize * newSize;
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
    // Create a very small base speed that scales consistently with the speed factor
    // Keep this value small to ensure smooth motion
    const baseSpeed = speedFactor * 0.5;

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
        // Very small angle change for smooth rotation
        this.angleSpeed = (Math.random() * 0.04 - 0.02) * speedFactor;
        break;

      case 2: // Left to Right
        this.speedX = baseSpeed;
        this.speedY = (Math.random() * 0.4 - 0.2) * baseSpeed;
        break;

      case 3: // Right to Left
        this.speedX = -baseSpeed;
        this.speedY = (Math.random() * 0.4 - 0.2) * baseSpeed;
        break;

      case 4: // Top to Bottom
        this.speedX = (Math.random() * 0.4 - 0.2) * baseSpeed;
        this.speedY = baseSpeed;
        break;

      case 5: // Bottom to Top
        this.speedX = (Math.random() * 0.4 - 0.2) * baseSpeed;
        this.speedY = -baseSpeed;
        break;

      case 6: // Random
      default:
        const randomAngle = Math.random() * Math.PI * 2;
        this.speedX = Math.cos(randomAngle) * baseSpeed;
        this.speedY = Math.sin(randomAngle) * baseSpeed;
    }
  }

  /**
   * Update particle position and handle bouncing or wrapping
   */
  update(
    canvasWidth: number,
    canvasHeight: number,
    speed: number,
    bounce: boolean,
  ): void {
    // Apply speed factor to movement
    const speedMultiplier = speed;

    // Position update with speed multiplier
    this.x += this.speedX * speedMultiplier;
    this.y += this.speedY * speedMultiplier;

    // Handle circular movement with smooth rotation
    if (this.angleSpeed !== 0) {
      this.angle += this.angleSpeed * speedMultiplier;

      // Use smooth sine/cosine for circular motion
      const baseSpeed = Math.sqrt(
        this.speedX * this.speedX + this.speedY * this.speedY,
      );
      this.speedX = Math.cos(this.angle) * baseSpeed;
      this.speedY = Math.sin(this.angle) * baseSpeed;
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
    let blendModeOverride: GlobalCompositeOperation | null = null;

    // Use the colorOffset for variation between particles
    const offset = this.colorOffset;
    const normalizedTime = time * 0.2; // Slow down color changes for smoother transitions

    switch (colorMode) {
      case 0: // Aurora
        // Create flowing aurora-like colors
        hue =
          (140 +
            Math.sin(normalizedTime * 0.5 + this.y / 80) * 40 +
            Math.cos(normalizedTime * 0.3 + this.x / 120) * 40 +
            offset * 0.2) %
          360;
        sat = saturation * 0.9;
        light =
          50 +
          Math.sin(normalizedTime + (this.x + this.y) / 200) * 15 +
          (intensity - 100) / 5;
        blendModeOverride = "screen";
        break;

      case 1: // Cyberpunk
        const cyberColors = [320, 195, 270, 170]; // Pink, Teal, Purple, Green
        hue =
          cyberColors[
            Math.floor((this.x + this.y + normalizedTime * 100) / 100) %
              cyberColors.length
          ];
        sat = saturation;
        light = 55 + (intensity - 100) / 4;
        break;

      case 2: // Fire and Ice
        if (this.y < this.x) {
          // Fire in top-right, ice in bottom-left
          hue = 10 + Math.sin(normalizedTime + this.y / 50) * 20; // Fire: red-orange
          sat = saturation;
          light =
            50 + Math.sin(normalizedTime * 3) * 10 + (intensity - 100) / 5;
        } else {
          hue = 200 + Math.sin(normalizedTime - this.x / 100) * 20; // Ice: blue
          sat = saturation * 0.8;
          light =
            60 + Math.sin(normalizedTime * 2) * 10 + (intensity - 100) / 5;
        }
        break;

      case 3: // Galaxy
        // Cosmic-like swirling galaxy patterns
        const distFromCenter = Math.sqrt(
          Math.pow(this.x - window.innerWidth / 2, 2) +
            Math.pow(this.y - window.innerHeight / 2, 2),
        );

        // Spiral pattern based on distance and angle
        const spiral =
          Math.atan2(
            this.y - window.innerHeight / 2,
            this.x - window.innerWidth / 2,
          ) * 10;
        hue =
          (270 +
            spiral +
            distFromCenter / 5 +
            normalizedTime * 5 +
            offset * 0.3) %
          360;

        // Vary saturation based on distance from center
        sat = Math.min(saturation, 70 + distFromCenter / 8);
        light =
          25 +
          Math.sin(normalizedTime + distFromCenter / 30) * 15 +
          (intensity - 100) / 5;

        // Make outer particles more transparent for depth
        this.alpha = 0.3 + Math.min(0.7, 300 / (distFromCenter + 100));
        blendModeOverride = "lighten";
        break;

      case 4: // Heat Map
        hue = ((this.x + this.y) / 5 + normalizedTime * 20) % 100;
        hue = hue < 50 ? hue * 3 : (100 - hue) * 6; // 0-150 red-yellow, 150-300 yellow-orange
        sat = saturation;
        light = 45 + (intensity - 100) / 4;
        break;

      case 5: // Neon
        const neonColors = [320, 260, 180, 120, 200]; // Pink, Purple, Cyan, Green, Blue
        const index =
          Math.floor(normalizedTime + this.x / 100 + this.y / 100) %
          neonColors.length;
        hue = neonColors[index];
        sat = saturation;
        light = 60 + (intensity - 100) / 4;
        blendModeOverride = "screen";
        break;

      case 6: // Ocean
        hue = 180 + Math.sin(normalizedTime + this.x / 100) * 30; // Range around cyan/blue
        sat = saturation;
        light =
          40 +
          Math.sin(normalizedTime * 2 + this.y / 50) * 20 +
          (intensity - 100) / 5;
        break;

      case 7: // Pastel
        hue = (normalizedTime * 20 + this.x + this.y + offset) % 360;
        sat = saturation * 0.6; // Reduce saturation for pastel
        light = 75 + (intensity - 100) / 8; // Higher lightness for pastel
        break;

      case 8: // Prism
        // Prismatic light spectrum effect
        const wave1 = Math.sin(normalizedTime * 0.7 + this.x / 50);
        const wave2 = Math.cos(normalizedTime * 0.5 + this.y / 60);
        const wave3 = Math.sin((this.x + this.y) / 100 + normalizedTime);

        // Create interference patterns
        hue =
          (offset + (wave1 + wave2 + wave3) * 60 + normalizedTime * 20) % 360;
        sat = Math.min(saturation, 90 + wave1 * 10);
        light = 60 + wave2 * 15 + (intensity - 100) / 5;

        // Randomize alpha for sparkle effect
        this.alpha = 0.6 + Math.random() * 0.4;
        blendModeOverride = "lighten";
        break;

      case 9: // Rainbow
        hue = (normalizedTime * 30 + this.x + this.y + offset) % 360;
        sat = saturation;
        light = 50 + (intensity - 100) / 4;
        break;

      case 10: // Sunset
        // Warm sunset colors with gradation
        const verticalPos = this.y / window.innerHeight;

        if (verticalPos < 0.4) {
          // Sky colors - blue to purple
          hue = 220 + Math.sin(normalizedTime * 0.3) * 20 - verticalPos * 140;
          sat = 70 + verticalPos * 30;
          light = 65 - verticalPos * 30 + (intensity - 100) / 5;
        } else {
          // Sunset colors - orange to red
          hue =
            30 - (verticalPos - 0.4) * 60 + Math.sin(normalizedTime * 0.5) * 10;
          sat = Math.min(saturation, 90 + (verticalPos - 0.4) * 10);
          light = 50 - (verticalPos - 0.4) * 20 + (intensity - 100) / 5;
        }
        break;

      case 11: // Synthwave
        // Create 80s synthwave palette with grid-like variations
        const gridX = Math.floor(this.x / 40);
        const gridY = Math.floor(this.y / 40);

        // Purple to pink to blue palette
        if ((gridX + gridY) % 3 === 0) {
          hue = 280 + Math.sin(normalizedTime * 0.5) * 20; // Purple
        } else if ((gridX + gridY) % 3 === 1) {
          hue = 320 + Math.sin(normalizedTime * 0.3) * 15; // Pink
        } else {
          hue = 210 + Math.sin(normalizedTime * 0.4) * 25; // Blue
        }

        sat = Math.min(saturation * 1.2, 100);
        light =
          55 + Math.sin(normalizedTime * 0.8) * 10 + (intensity - 100) / 5;
        blendModeOverride = "screen";
        break;

      default:
        hue = (normalizedTime * 50 + offset) % 360;
        sat = saturation;
        light = 50 + (intensity - 100) / 4;
    }

    // Apply saturation scaling (0-200%)
    sat = Math.min(100, sat);

    // Apply lightness/intensity scaling
    light = Math.max(20, Math.min(80, light));

    // Set the blend mode if overridden
    if (blendModeOverride) {
      this.blendMode = blendModeOverride;
    } else {
      this.blendMode = "lighter";
    }

    this.color = `hsl(${hue}, ${sat}%, ${light}%)`;
  }
}
