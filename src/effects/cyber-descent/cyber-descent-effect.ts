/**
 * Cyber Descent - Main Effect Class
 * Implements the Cyber Descent effect using WebGL
 */
import { WebGLEffect } from "../../common/webgl-effect";
import { CyberDescentControls, CYBERPUNK_MODES } from "./types";
import {
  Effect,
  NumberControl,
  ComboboxControl,
} from "../../common/control-decorators";
import * as THREE from "three";

// Import shader code
import fragmentShader from "./fragment.glsl";

// Interface with window properties for type-safety
declare global {
  interface Window {
    speed: number;
    zoom: number;
    cyberpunkMode: string | number;
    fogDensity: number;
    lightIntensity: number;
    colorSaturation: number;
    colorIntensity: number;
  }
}

/**
 * Cyber Descent effect implementation using WebGL/Three.js
 */
@Effect({
  name: "Cyber Descent",
  description: "A cyberpunk city flying effect inspired by classic demos",
  author: "hyperb1iss",
})
export class CyberDescentEffect extends WebGLEffect<CyberDescentControls> {
  @NumberControl({
    label: "Flight Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip:
      "Controls the speed of movement through the city (1=Slow, 10=Fast)",
  })
  speed!: number;

  @NumberControl({
    label: "Camera Zoom",
    min: 5,
    max: 20,
    default: 10,
    tooltip: "Adjusts the field of view (5=Wide, 20=Narrow)",
  })
  zoom!: number;

  @ComboboxControl({
    label: "City Style",
    values: CYBERPUNK_MODES,
    default: "Standard",
    tooltip: "Changes the overall style and color scheme of the city",
  })
  cyberpunkMode!: string;

  @NumberControl({
    label: "Fog Density",
    min: 10,
    max: 200,
    default: 100,
    tooltip: "Controls the density of the atmospheric fog effect",
  })
  fogDensity!: number;

  @NumberControl({
    label: "Light Intensity",
    min: 10,
    max: 200,
    default: 100,
    tooltip: "Controls the brightness of the city lights",
  })
  lightIntensity!: number;

  @NumberControl({
    label: "Color Saturation",
    min: 0,
    max: 200,
    default: 100,
    tooltip: "Adjust color saturation level (0=B&W, 100=Normal)",
  })
  colorSaturation!: number;

  @NumberControl({
    label: "Color Intensity",
    min: 10,
    max: 200,
    default: 100,
    tooltip: "Adjust color brightness (100=Normal)",
  })
  colorIntensity!: number;

  constructor() {
    super({
      id: "cyber-descent",
      name: "Cyber Descent",
      debug: true, // Enable debug mode
      fragmentShader,
    });

    // Add direct console log to verify constructor is called
    console.log("👋 CyberDescentEffect constructor called");
  }

  /**
   * Initialize the controls and their default values
   */
  protected initializeControls(): void {
    console.log("🎛️ Initializing controls");
    // Set default values for the controls
    window.speed = 5;
    window.zoom = 10;
    window.cyberpunkMode = CYBERPUNK_MODES[0];
    window.fogDensity = 100;
    window.lightIntensity = 100;
    window.colorSaturation = 100;
    window.colorIntensity = 100;
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): CyberDescentControls {
    // Handle cyberpunkMode conversion from string to number index
    let cyberpunkMode: number = 0;

    if (typeof window.cyberpunkMode === "string") {
      const modeIndex = CYBERPUNK_MODES.indexOf(window.cyberpunkMode);
      cyberpunkMode = modeIndex === -1 ? 0 : modeIndex;
    } else {
      cyberpunkMode = Number(window.cyberpunkMode || 0);
    }

    return {
      speed: (window.speed ?? 5) / 5, // Normalize to 0-1 range with max = 2
      zoom: (window.zoom ?? 10) / 10, // Scale zoom for shader use
      cyberpunkMode,
      fogDensity: (window.fogDensity ?? 100) / 100, // Normalize to 0-1 range
      lightIntensity: (window.lightIntensity ?? 100) / 100, // Normalize to 0-1 range
      colorSaturation: (window.colorSaturation ?? 100) / 100, // Normalize to 0-1 range
      colorIntensity: (window.colorIntensity ?? 100) / 100, // Normalize to 0-1 range
    };
  }

  /**
   * Apply control values to the effect parameters
   */
  protected updateParameters(controls: CyberDescentControls): void {
    // Update uniforms is handled by the updateUniforms method
    super.updateParameters(controls);
  }

  /**
   * Create the uniforms for the shader
   */
  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iZoom: { value: 1.0 },
      iCyberpunkMode: { value: 0 },
      iFogDensity: { value: 1.0 },
      iLightIntensity: { value: 1.0 },
      iColorSaturation: { value: 1.0 },
      iColorIntensity: { value: 1.0 },
    };
  }

  /**
   * Update the shader uniforms with current control values
   */
  protected updateUniforms(controls: CyberDescentControls): void {
    if (!this.material) {
      this.debug("error", "Material not available for updating uniforms");
      return;
    }

    // Update all uniform values based on controls
    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iZoom.value = controls.zoom;
    this.material.uniforms.iCyberpunkMode.value = controls.cyberpunkMode;
    this.material.uniforms.iFogDensity.value = controls.fogDensity;
    this.material.uniforms.iLightIntensity.value = controls.lightIntensity;
    this.material.uniforms.iColorSaturation.value = controls.colorSaturation;
    this.material.uniforms.iColorIntensity.value = controls.colorIntensity;
  }
}
