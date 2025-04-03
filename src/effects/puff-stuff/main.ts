/**
 * PuffStuff - Raymarched tunnel effect with dynamic colors and styles
 */
import { BaseEffect } from "../../common/effect";
import {
  normalizeSpeed,
  normalizePercentage,
  boolToInt,
} from "../../common/controls";
import { initializeEffect } from "../../common";
import * as THREE from "three";

// Import shaders
import fragmentShader from "./fragment.glsl";
import vertexShader from "./vertex.glsl";

// Define control interface
export interface PuffStuffControls {
  speed: number;
  colorShift: boolean | number;
  colorScheme: string | number;
  effectStyle: string | number;
  colorIntensity: number;
  colorPulse: number;
  motionWave: number;
  motionReverse: boolean | number;
  colorSaturation: number;
}

/**
 * PuffStuff tunnel effect implementation
 */
export class PuffStuffEffect extends BaseEffect<PuffStuffControls> {
  // Color scheme options for conversion
  private readonly colorSchemes = [
    "Classic Blue",
    "Cyberpunk",
    "Fire",
    "Toxic",
    "Ethereal",
    "Monochrome",
    "Rainbow",
    "Electric",
    "Amethyst",
    "Coral Reef",
    "Deep Sea",
    "Emerald",
    "Neon",
    "Rose Gold",
    "Sunset",
    "Vapor Wave",
  ];

  // Effect style options for conversion
  private readonly effectStyles = [
    "Standard",
    "Wireframe",
    "Glitch",
    "Hologram",
    "Film Noir",
  ];

  constructor() {
    super({
      id: "puff-stuff",
      name: "PuffStuff",
      debug: true,
      fragmentShader,
      vertexShader,
    });
  }

  /**
   * Initialize the controls and their default values
   */
  protected initializeControls(): void {
    // Set default values to make them available globally for SignalRGB
    (window as any).speed = 5;
    (window as any).colorShift = 1;
    (window as any).colorScheme = "Classic Blue";
    (window as any).effectStyle = "Standard";
    (window as any).colorIntensity = 100;
    (window as any).colorPulse = 0;
    (window as any).motionWave = 0;
    (window as any).motionReverse = 0;
    (window as any).colorSaturation = 100;
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): PuffStuffControls {
    // Handle colorScheme string/number conversion
    let colorScheme = (window as any).colorScheme;
    if (typeof colorScheme === "string") {
      const schemeIndex = this.colorSchemes.indexOf(colorScheme);
      colorScheme = schemeIndex === -1 ? 0 : schemeIndex;
    } else {
      colorScheme = Number(colorScheme || 0);
    }

    // Handle effectStyle string/number conversion
    let effectStyle = (window as any).effectStyle;
    if (typeof effectStyle === "string") {
      const styleIndex = this.effectStyles.indexOf(effectStyle);
      effectStyle = styleIndex === -1 ? 0 : styleIndex;
    } else {
      effectStyle = Number(effectStyle || 0);
    }

    return {
      speed: normalizeSpeed((window as any).speed || 5),
      colorShift: boolToInt((window as any).colorShift),
      colorScheme,
      effectStyle,
      colorIntensity: normalizePercentage(
        (window as any).colorIntensity || 100,
      ),
      colorPulse: Number((window as any).colorPulse || 0) / 10,
      motionWave: Number((window as any).motionWave || 0) / 10,
      motionReverse: boolToInt((window as any).motionReverse),
      colorSaturation: normalizePercentage(
        (window as any).colorSaturation || 100,
      ),
    };
  }

  /**
   * Create custom uniforms specific to this effect
   */
  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iColorShift: { value: true },
      iColorScheme: { value: 0 },
      iEffectStyle: { value: 0 },
      iColorIntensity: { value: 1.0 },
      iColorPulse: { value: 0.0 },
      iMotionWave: { value: 0.0 },
      iMotionReverse: { value: false },
      iColorSaturation: { value: 1.0 },
    };
  }

  /**
   * Update shader uniforms based on control values
   */
  protected updateUniforms(controls: PuffStuffControls): void {
    if (!this.material) return;

    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iColorShift.value = controls.colorShift === 1;
    this.material.uniforms.iColorScheme.value = controls.colorScheme;
    this.material.uniforms.iEffectStyle.value = controls.effectStyle;
    this.material.uniforms.iColorIntensity.value = controls.colorIntensity;
    this.material.uniforms.iColorPulse.value = controls.colorPulse;
    this.material.uniforms.iMotionWave.value = controls.motionWave;
    this.material.uniforms.iMotionReverse.value = controls.motionReverse === 1;
    this.material.uniforms.iColorSaturation.value = controls.colorSaturation;
  }
}

// Create effect instance
const effect = new PuffStuffEffect();

// Initialize the effect using the common initializer for SignalRGB
initializeEffect(() => {
  console.log("[PuffStuff] Initializing through common initializer");
  effect.initialize();
});

// Export the effect instance
export default effect;
