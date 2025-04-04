/**
 * PuffStuff - Raymarched tunnel effect with dynamic colors and styles
 */
import { WebGLEffect } from "../../core/effects/webgl-effect";
import { normalizeSpeed, boolToInt } from "../../core/controls/helpers";
import {
  Effect,
  NumberControl,
  BooleanControl,
  ComboboxControl,
} from "../../core/controls/decorators";
import { initializeEffect } from "../../core";
import * as THREE from "three";

// Import shaders
import fragmentShader from "./fragment.glsl";

// Interface with window properties for type-safety
declare global {
  interface Window {
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
}

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
@Effect({
  name: "Puff Stuff Tunnel",
  description:
    "A WebGL ray marched tunnel effect with dynamic colors and styles",
  author: "hyperb1iss",
})
export class PuffStuffEffect extends WebGLEffect<PuffStuffControls> {
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

  @NumberControl({
    label: "Animation Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls the speed of the animation effect (1=Slow, 10=Fast)",
  })
  speed!: number;

  @BooleanControl({
    label: "Color Shift",
    default: true,
    tooltip: "Toggles additional color shifting effects",
  })
  colorShift!: boolean;

  @ComboboxControl({
    label: "Color Scheme",
    values: [
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
    ],
    default: "Classic Blue",
    tooltip: "Select the color palette for the tunnel",
  })
  colorScheme!: string;

  @ComboboxControl({
    label: "Effect Style",
    values: ["Standard", "Wireframe", "Glitch", "Hologram", "Film Noir"],
    default: "Standard",
    tooltip: "Choose the visual style of the effect",
  })
  effectStyle!: string;

  @NumberControl({
    label: "Color Intensity",
    min: 1,
    max: 200,
    default: 100,
    tooltip:
      "Adjust the intensity of colors (0=Muted, 100=Normal, 200=Vibrant)",
  })
  colorIntensity!: number;

  @NumberControl({
    label: "Color Pulse",
    min: 0,
    max: 10,
    default: 0,
    tooltip: "Add rhythmic color pulsing (0=Off, 10=Intense)",
  })
  colorPulse!: number;

  @NumberControl({
    label: "Motion Wave",
    min: 0,
    max: 10,
    default: 0,
    tooltip: "Add wave distortion to the tunnel (0=None, 10=Maximum)",
  })
  motionWave!: number;

  @BooleanControl({
    label: "Reverse Direction",
    default: false,
    tooltip: "Reverse the direction of tunnel movement",
  })
  motionReverse!: boolean;

  @NumberControl({
    label: "Color Saturation",
    min: 1,
    max: 200,
    default: 100,
    tooltip:
      "Adjust the saturation level of colors (100=Normal, 200=Super Saturated)",
  })
  colorSaturation!: number;

  constructor() {
    super({
      id: "puff-stuff",
      name: "PuffStuff",
      debug: true,
      fragmentShader,
    });
  }

  /**
   * Initialize the controls and their default values
   */
  protected initializeControls(): void {
    // Set default values to make them available globally for SignalRGB
    window.speed = 5;
    window.colorShift = 1;
    window.colorScheme = "Classic Blue";
    window.effectStyle = "Standard";
    window.colorIntensity = 100;
    window.colorPulse = 0;
    window.motionWave = 0;
    window.motionReverse = 0;
    window.colorSaturation = 100;
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): PuffStuffControls {
    // Handle colorScheme string/number conversion
    let colorScheme: number | string = window.colorScheme;

    if (typeof colorScheme === "string") {
      const schemeIndex = this.colorSchemes.indexOf(colorScheme);
      colorScheme = schemeIndex === -1 ? 0 : schemeIndex;
    } else {
      colorScheme = Number(colorScheme || 0);
    }

    // Handle effectStyle string/number conversion
    let effectStyle: number | string = window.effectStyle;

    if (typeof effectStyle === "string") {
      const styleIndex = this.effectStyles.indexOf(effectStyle);
      effectStyle = styleIndex === -1 ? 0 : styleIndex;
    } else {
      effectStyle = Number(effectStyle || 0);
    }

    return {
      speed: normalizeSpeed(window.speed ?? 5),
      colorShift: boolToInt(window.colorShift ?? 1),
      colorScheme,
      effectStyle,
      colorIntensity: Number(window.colorIntensity ?? 100) / 100,
      colorPulse: Number(window.colorPulse ?? 0) / 10,
      motionWave: Number(window.motionWave ?? 0) / 10,
      motionReverse: boolToInt(window.motionReverse ?? 0),
      colorSaturation: Number(window.colorSaturation ?? 100) / 100,
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
