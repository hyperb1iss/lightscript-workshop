/**
 * SimpleWave - Wave-based RGB effect with minimal resource usage
 */
import { BaseEffect } from "../../common/effect";
import {
  normalizeSpeed,
  normalizePercentage,
  boolToInt,
  getControlValue,
} from "../../common/controls";
import { initializeEffect } from "../../common";
import * as THREE from "three";

// Import shaders
import fragmentShader from "./fragment.glsl";
import vertexShader from "./vertex.glsl";

// Define control interface
export interface SimpleWaveControls {
  speed: number;
  waveCount: number;
  colorMode: string | number;
  colorSpeed: number;
  reverseDirection: boolean | number;
  colorIntensity: number;
  waveHeight: number;
}

/**
 * SimpleWave effect implementation
 */
export class SimpleWaveEffect extends BaseEffect<SimpleWaveControls> {
  // Define color mode options for conversion
  private readonly colorModes = ["Rainbow", "Ocean", "Fire", "Neon", "Mono"];

  constructor() {
    super({
      id: "simple-wave",
      name: "SimpleWave",
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
    window.speed = 5;
    window.waveCount = 5;
    window.colorMode = "Rainbow";
    window.colorSpeed = 3;
    window.reverseDirection = 0;
    window.colorIntensity = 100;
    window.waveHeight = 50;
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): SimpleWaveControls {
    // Handle colorMode string/number conversion
    const rawColorMode = getControlValue<string | number>(
      "colorMode",
      "Rainbow",
    );
    let colorMode: number | string = rawColorMode;

    if (typeof colorMode === "string") {
      const modeIndex = this.colorModes.indexOf(colorMode);
      colorMode = modeIndex === -1 ? 0 : modeIndex;
    } else {
      colorMode = Number(colorMode || 0);
    }

    return {
      speed: normalizeSpeed(getControlValue<number>("speed", 5)),
      waveCount: Number(getControlValue<number>("waveCount", 5)),
      colorMode,
      colorSpeed: normalizeSpeed(getControlValue<number>("colorSpeed", 3)),
      reverseDirection: boolToInt(
        getControlValue<boolean | number>("reverseDirection", 0),
      ),
      colorIntensity: normalizePercentage(
        getControlValue<number>("colorIntensity", 100),
      ),
      waveHeight: getControlValue<number>("waveHeight", 50) / 100,
    };
  }

  /**
   * Create custom uniforms specific to this effect
   */
  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iWaveCount: { value: 5.0 },
      iColorMode: { value: 0 },
      iColorSpeed: { value: 1.0 },
      iReverseDirection: { value: false },
      iColorIntensity: { value: 1.0 },
      iWaveHeight: { value: 0.5 },
    };
  }

  /**
   * Update shader uniforms based on control values
   */
  protected updateUniforms(controls: SimpleWaveControls): void {
    if (!this.material) return;

    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iWaveCount.value = controls.waveCount;
    this.material.uniforms.iColorMode.value = controls.colorMode;
    this.material.uniforms.iColorSpeed.value = controls.colorSpeed;
    this.material.uniforms.iReverseDirection.value =
      controls.reverseDirection === 1;
    this.material.uniforms.iColorIntensity.value = controls.colorIntensity;
    this.material.uniforms.iWaveHeight.value = controls.waveHeight;
  }
}

// Create effect instance
const effect = new SimpleWaveEffect();

// Initialize the effect using the common initializer for SignalRGB
initializeEffect(() => {
  console.log("[SimpleWave] Initializing through common initializer");
  effect.initialize();
});

// Export the effect instance
export default effect;
