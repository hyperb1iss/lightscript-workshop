/**
 * Kaleido Tunnel - Decorator-based WebGL effect
 * Radial kaleidoscope tunnel with configurable symmetry and twist
 */
import { WebGLEffect } from "../../core/effects/webgl-effect";
import {
  Effect,
  NumberControl,
  ComboboxControl,
} from "../../core/controls/decorators";
import { normalizePercentage, comboboxValueToIndex } from "../../core/controls/helpers";
import { initializeEffect } from "../../core";
import type * as THREE from "three";

// Shader
import fragmentShader from "./fragment.glsl";

export interface KaleidoTunnelControls {
  speed: number; // normalized
  colorIntensity: number; // 0-2
  colorSaturation: number; // 0-2
  segments: number; // 3-12
  twist: number; // 0-1
  colorMode: string | number; // enum index
  colorShift: number; // 0-2
  aberration: number; // 0-1
  warp: number; // 0-1
  pulse: number; // 0-1
  style: string | number; // enum index
  multiHue: number; // 0-1
  paletteDrift: number; // 0-1
  spectrumSpread: number; // 0-2
}

@Effect({
  name: "Kaleido Tunnel",
  description: "Kaleidoscopic tunnel with adjustable symmetry and twist",
  author: "hyperb1iss",
})
export class KaleidoTunnelEffect extends WebGLEffect<KaleidoTunnelControls> {
  private readonly colorModes = [
    "Rainbow",
    "Neon",
    "Monochrome",
    "Electric",
    "Amethyst",
    "Sunset",
    "Toxic",
    "Vaporwave",
    "Deep Sea",
  ];
  private readonly styleModes = ["Standard", "Glitch", "Holo", "Grain"];

  @NumberControl({
    label: "Animation Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls motion speed (1=Slow, 10=Fast)",
  })
  speed!: number;

  @NumberControl({
    label: "Color Intensity",
    min: 10,
    max: 200,
    default: 120,
    tooltip: "Overall brightness of colors (100=Normal)",
  })
  colorIntensity!: number;

  @NumberControl({
    label: "Color Saturation",
    min: 0,
    max: 200,
    default: 120,
    tooltip: "Color saturation (100=Normal)",
  })
  colorSaturation!: number;

  @NumberControl({
    label: "Segments",
    min: 3,
    max: 12,
    default: 6,
    step: 1,
    tooltip: "Number of kaleidoscope segments",
  })
  segments!: number;

  @NumberControl({
    label: "Twist",
    min: 0,
    max: 100,
    default: 40,
    tooltip: "Amount of angular twist (higher = more twist)",
  })
  twist!: number;

  @NumberControl({
    label: "Depth Falloff",
    min: 0,
    max: 200,
    default: 80,
    tooltip: "Controls tunnel fading with distance",
  })
  // Removed per user request (no radial falloff)
  depthFalloff!: number;

  @ComboboxControl({
    label: "Color Mode",
    values: [
      "Rainbow",
      "Neon",
      "Monochrome",
      "Electric",
      "Amethyst",
      "Sunset",
      "Toxic",
      "Vaporwave",
      "Deep Sea",
    ],
    default: "Rainbow",
    tooltip: "Color palette",
  })
  colorMode!: string;

  @NumberControl({
    label: "Color Shift",
    min: 0,
    max: 200,
    default: 100,
    tooltip: "Hue rotation intensity",
  })
  colorShift!: number;

  @NumberControl({
    label: "Aberration",
    min: 0,
    max: 100,
    default: 20,
    tooltip: "Chromatic channel offset",
  })
  aberration!: number;

  @NumberControl({
    label: "Warp",
    min: 0,
    max: 100,
    default: 30,
    tooltip: "Pattern warping amount",
  })
  warp!: number;

  @NumberControl({
    label: "Pulse",
    min: 0,
    max: 100,
    default: 50,
    tooltip: "Pulsing color modulation",
  })
  pulse!: number;

  @ComboboxControl({
    label: "Style",
    values: ["Standard", "Glitch", "Holo", "Grain"],
    default: "Standard",
    tooltip: "Post style filter",
  })
  style!: string;

  @NumberControl({
    label: "Multi Hue",
    min: 0,
    max: 100,
    default: 60,
    tooltip: "Blend multiple hues for richer palettes",
  })
  multiHue!: number;

  @NumberControl({
    label: "Palette Drift",
    min: 0,
    max: 100,
    default: 40,
    tooltip: "Slow palette morphing over time",
  })
  paletteDrift!: number;

  @NumberControl({
    label: "Spectrum Spread",
    min: 0,
    max: 200,
    default: 120,
    tooltip: "Distance between mixed hues",
  })
  spectrumSpread!: number;

  constructor() {
    super({
      id: "kaleido-tunnel",
      name: "Kaleido Tunnel",
      debug: true,
      fragmentShader,
    });
  }

  protected initializeControls(): void {
    window.speed = 5;
    window.colorIntensity = 120; // percent
    window.colorSaturation = 120; // percent
    window.segments = 6;
    window.twist = 40; // percent
    window.colorMode = "Rainbow";
    window.colorShift = 100;
    window.aberration = 20;
    window.warp = 30;
    window.pulse = 50;
    window.style = "Standard";
    window.multiHue = 60;
    window.paletteDrift = 40;
    window.spectrumSpread = 120;
  }

  protected getControlValues(): KaleidoTunnelControls {
    // Map combobox to index
    const w = window as unknown as Record<string, unknown>;
    const colorModeIndex = comboboxValueToIndex(
      (w.colorMode as string | number | undefined) ?? "Rainbow",
      this.colorModes,
      0,
    );
    const styleIndex = comboboxValueToIndex(
      (w.style as string | number | undefined) ?? "Standard",
      this.styleModes,
      0,
    );

    // Softer speed curve for fine low-end control (1-10 -> ~0.05..0.55)
    const rawSpeed = Number(window.speed ?? 5);
    const clamped = Math.min(10, Math.max(1, rawSpeed));
    const tNorm = (clamped - 1) / 9; // 0..1
    const eased = Math.pow(tNorm, 1.2);
    const mappedSpeed = 0.05 + eased * 0.5; // 0.05..0.55

    return {
      speed: mappedSpeed,
      colorIntensity:
        normalizePercentage(window.colorIntensity ?? 120, 120, 0.0) * 2.0,
      colorSaturation:
        normalizePercentage(window.colorSaturation ?? 120, 120, 0.0) * 2.0,
      segments: Math.max(
        3,
        Math.min(12, Math.round((w.segments as number | undefined) ?? 6)),
      ),
      twist: normalizePercentage(
        (w.twist as number | undefined) ?? 40,
        100,
        0.0,
      ),
      colorMode: colorModeIndex,
      colorShift:
        normalizePercentage(
          (w.colorShift as number | undefined) ?? 100,
          100,
          0.0,
        ) * 2.0,
      aberration: normalizePercentage(
        (w.aberration as number | undefined) ?? 20,
        100,
        0.0,
      ),
      warp: normalizePercentage((w.warp as number | undefined) ?? 30, 100, 0.0),
      pulse: normalizePercentage(
        (w.pulse as number | undefined) ?? 50,
        100,
        0.0,
      ),
      style: styleIndex,
      multiHue: normalizePercentage(
        (w.multiHue as number | undefined) ?? 60,
        100,
        0.0,
      ),
      paletteDrift: normalizePercentage(
        (w.paletteDrift as number | undefined) ?? 40,
        100,
        0.0,
      ),
      spectrumSpread:
        normalizePercentage(
          (w.spectrumSpread as number | undefined) ?? 120,
          120,
          0.0,
        ) * 2.0,
    };
  }

  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iColorIntensity: { value: 1.2 },
      iColorSaturation: { value: 1.2 },
      iSegments: { value: 6 },
      iTwist: { value: 0.4 },
      iColorMode: { value: 0 },
      iColorShift: { value: 1.0 },
      iAberration: { value: 0.2 },
      iWarp: { value: 0.3 },
      iPulse: { value: 0.5 },
      iStyle: { value: 0 },
      iMultiHue: { value: 0.6 },
      iPaletteDrift: { value: 0.4 },
      iSpectrumSpread: { value: 1.2 },
    };
  }

  protected updateUniforms(controls: KaleidoTunnelControls): void {
    if (!this.material) return;
    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iColorIntensity.value = controls.colorIntensity;
    this.material.uniforms.iColorSaturation.value = controls.colorSaturation;
    this.material.uniforms.iSegments.value = controls.segments;
    this.material.uniforms.iTwist.value = controls.twist;
    this.material.uniforms.iColorMode.value = controls.colorMode as number;
    this.material.uniforms.iColorShift.value = controls.colorShift;
    this.material.uniforms.iAberration.value = controls.aberration;
    this.material.uniforms.iWarp.value = controls.warp;
    this.material.uniforms.iPulse.value = controls.pulse;
    this.material.uniforms.iStyle.value = controls.style as number;
    this.material.uniforms.iMultiHue.value = controls.multiHue;
    this.material.uniforms.iPaletteDrift.value = controls.paletteDrift;
    this.material.uniforms.iSpectrumSpread.value = controls.spectrumSpread;
  }
}

// Create and initialize effect
const effect = new KaleidoTunnelEffect();
initializeEffect(() => effect.initialize());

export default effect;
