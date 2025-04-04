/**
 * SimpleWave - Decorator-based implementation
 * Wave-based RGB effect with minimal resource usage
 */
import { WebGLEffect } from "../../common/webgl-effect";
import {
  Effect,
  NumberControl,
  BooleanControl,
  ComboboxControl,
} from "../../common/control-decorators";
import { normalizeSpeed, boolToInt } from "../../common/controls";
import { initializeEffect } from "../../common";
import * as THREE from "three";

// Import shaders
import fragmentShader from "./fragment.glsl";

// Interface with window properties for type-safety
declare global {
  interface Window {
    speed: number;
    waveCount: number;
    colorMode: string | number;
    colorSpeed: number;
    reverseDirection: boolean | number;
    colorIntensity: number;
    waveHeight: number;
  }
}

/**
 * SimpleWaveControls interface for TypeScript type checking
 */
export interface SimpleWaveDecoratorControls {
  speed: number;
  waveCount: number;
  colorMode: string | number;
  colorSpeed: number;
  reverseDirection: boolean | number;
  colorIntensity: number;
  waveHeight: number;
}

/**
 * Decorator-based SimpleWave effect implementation
 */
@Effect({
  name: "Simple Wave",
  description: "A simple wave-based RGB effect with minimal resource usage",
  author: "hyperb1iss",
})
export class SimpleWaveDecoratorEffect extends WebGLEffect<SimpleWaveDecoratorControls> {
  // Define color mode options for conversion
  private readonly colorModes = ["Rainbow", "Ocean", "Fire", "Neon", "Mono"];

  // Control properties with decorators
  @NumberControl({
    label: "Animation Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls the speed of the wave animation (1=Slow, 10=Fast)",
  })
  speed!: number;

  @NumberControl({
    label: "Wave Count",
    min: 1,
    max: 20,
    default: 5,
    tooltip: "Number of waves displayed across the width",
  })
  waveCount!: number;

  @ComboboxControl({
    label: "Color Mode",
    values: ["Rainbow", "Ocean", "Fire", "Neon", "Mono"],
    default: "Rainbow",
    tooltip: "Select the color palette for the waves",
  })
  colorMode!: string;

  @NumberControl({
    label: "Color Transition",
    min: 1,
    max: 10,
    default: 3,
    tooltip: "Controls how quickly colors transition (1=Slow, 10=Fast)",
  })
  colorSpeed!: number;

  @BooleanControl({
    label: "Reverse Direction",
    default: false,
    tooltip: "Reverse the direction of wave movement",
  })
  reverseDirection!: boolean;

  @NumberControl({
    label: "Color Intensity",
    min: 1,
    max: 200,
    default: 100,
    tooltip: "Adjust the intensity of colors (100=Normal, 200=Brighter)",
  })
  colorIntensity!: number;

  @NumberControl({
    label: "Wave Height",
    min: 1,
    max: 100,
    default: 50,
    tooltip:
      "Controls how high the waves appear (percentage of display height)",
  })
  waveHeight!: number;

  constructor() {
    super({
      id: "simple-wave-decorator",
      name: "Simple Wave (Decorator)",
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
    window.waveCount = 5;
    window.colorMode = "Rainbow";
    window.colorSpeed = 3;
    window.reverseDirection = 0;
    window.colorIntensity = 100;
    window.waveHeight = 50;
  }

  /**
   * Get current control values from global scope
   * We're reading from the global window object for compatibility
   */
  protected getControlValues(): SimpleWaveDecoratorControls {
    // Handle colorMode string/number conversion
    let colorMode: number | string = window.colorMode;

    if (typeof colorMode === "string") {
      const modeIndex = this.colorModes.indexOf(colorMode);
      colorMode = modeIndex === -1 ? 0 : modeIndex;
    } else {
      colorMode = Number(colorMode || 0);
    }

    return {
      speed: normalizeSpeed(window.speed ?? 5),
      waveCount: Number(window.waveCount ?? 5),
      colorMode,
      colorSpeed: normalizeSpeed(window.colorSpeed ?? 3),
      reverseDirection: boolToInt(window.reverseDirection ?? 0),
      colorIntensity: Number(window.colorIntensity ?? 100) / 100,
      waveHeight: (window.waveHeight ?? 50) / 100,
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
  protected updateUniforms(controls: SimpleWaveDecoratorControls): void {
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
const effect = new SimpleWaveDecoratorEffect();

// Initialize the effect using the common initializer for SignalRGB
initializeEffect(() => {
  console.log("[SimpleWaveDecorator] Initializing through common initializer");
  effect.initialize();
});

// Export the effect instance
export default effect;
