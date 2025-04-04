# 🎮 LightScript Effect Examples

<div align="center">

![Examples](https://img.shields.io/badge/RGB-Examples-05FFA1?style=for-the-badge)

</div>

> _Conjure digital rainbows with these magical examples_ ✨

This document provides complete examples of LightScript effects with step-by-step explanations. Use these as templates or inspiration for your own creative RGB adventures!

## 📑 Table of Contents

- [Simple Color Wave](#-simple-color-wave)
- [Audio Reactive Pulse](#-audio-reactive-pulse)
- [Rainbow Starfield](#-rainbow-starfield)
- [Fire Effect](#-fire-effect)
- [Tips & Tricks](#-tips--tricks)

## 🌊 Simple Color Wave

A beautiful moving wave of color that flows across your devices.

### Preview

```
█▓▒░      ░▒▓███████▓▒░      ░▒▓█
    ░▒▓███████▓▒░      ░▒▓███████
███▓▒░      ░▒▓███████▓▒░      ░▒
```

### Effect Structure

```
effects/color-wave/
├── fragment.glsl  # Shader code
└── main.ts        # Effect implementation with decorators
```

### Fragment Shader

```glsl
// effects/color-wave/fragment.glsl

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform float iWaveWidth;
uniform float iWaveHeight;
uniform int iColorMode;

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Different color modes
vec3 getColor(float t, int mode) {
  if (mode == 1) {
    // Ocean colors - blues and teals
    return mix(vec3(0.0, 0.2, 0.8), vec3(0.0, 0.8, 0.7), t);
  } else if (mode == 2) {
    // Fire colors - reds and oranges
    return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.6, 0.0), t);
  } else if (mode == 3) {
    // Neon - purples and pinks
    return mix(vec3(0.6, 0.0, 1.0), vec3(1.0, 0.0, 0.5), t);
  } else {
    // Default rainbow
    return hsv2rgb(vec3(t, 0.8, 1.0));
  }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalized pixel coordinates
  vec2 uv = fragCoord / iResolution.xy;

  // Time-based animation
  float time = iTime * iSpeed;

  // Create wave effect
  float wave = sin(uv.x * iWaveWidth + time) * 0.5 + 0.5;

  // Apply wave height
  wave = wave * iWaveHeight;

  // If pixel is within wave, color it
  if (uv.y < wave) {
    // Get color based on x position and time
    float colorPos = fract(uv.x - time * 0.1);
    vec3 color = getColor(colorPos, iColorMode);

    // Output colored pixel
    fragColor = vec4(color, 1.0);
  } else {
    // Black for parts above the wave
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### TypeScript Implementation

```typescript
// effects/color-wave/main.ts

import { WebGLEffect } from "../../core/effects/webgl-effect";
import {
  Effect,
  NumberControl,
  ComboboxControl,
} from "../../core/controls/decorators";
import {
  normalizeSpeed,
  normalizePercentage,
} from "../../core/controls/helpers";
import { initializeEffect } from "../../core";
import * as THREE from "three";

// Import the shader
import fragmentShader from "./fragment.glsl";

// Define control interface
export interface ColorWaveControls {
  speed: number;
  waveWidth: number;
  waveHeight: number;
  colorMode: string | number;
}

/**
 * ColorWave effect implementation
 */
@Effect({
  name: "Color Wave",
  description: "A flowing wave of color",
  author: "LightScript Workshop",
})
export class ColorWaveEffect extends WebGLEffect<ColorWaveControls> {
  // Color mode options
  private readonly colorModes = ["Rainbow", "Ocean", "Fire", "Neon"];

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
    label: "Wave Width",
    min: 1,
    max: 20,
    default: 5,
    tooltip: "Number of wave cycles across the width",
  })
  waveWidth!: number;

  @NumberControl({
    label: "Wave Height",
    min: 10,
    max: 100,
    default: 50,
    tooltip: "Controls the maximum height of the wave (percentage)",
  })
  waveHeight!: number;

  @ComboboxControl({
    label: "Color Scheme",
    values: ["Rainbow", "Ocean", "Fire", "Neon"],
    default: "Rainbow",
    tooltip: "Select the color palette for the effect",
  })
  colorMode!: string;

  constructor() {
    super({
      id: "color-wave",
      name: "Color Wave",
      debug: true,
      fragmentShader,
    });
  }

  /**
   * Initialize the controls
   */
  protected initializeControls(): void {
    window.speed = 5;
    window.waveWidth = 5;
    window.waveHeight = 50;
    window.colorMode = "Rainbow";
  }

  /**
   * Get current control values
   */
  protected getControlValues(): ColorWaveControls {
    // Convert colorMode from string to index if needed
    let colorMode: string | number = window.colorMode;

    if (typeof colorMode === "string") {
      const modeIndex = this.colorModes.indexOf(colorMode);
      colorMode = modeIndex === -1 ? 0 : modeIndex;
    }

    return {
      speed: normalizeSpeed(window.speed ?? 5),
      waveWidth: window.waveWidth ?? 5,
      waveHeight: normalizePercentage(window.waveHeight ?? 50, 100, 0.05),
      colorMode,
    };
  }

  /**
   * Create shader uniforms
   */
  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iWaveWidth: { value: 5.0 },
      iWaveHeight: { value: 0.5 },
      iColorMode: { value: 0 },
    };
  }

  /**
   * Update shader uniforms with control values
   */
  protected updateUniforms(controls: ColorWaveControls): void {
    if (!this.material) return;

    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iWaveWidth.value = controls.waveWidth;
    this.material.uniforms.iWaveHeight.value = controls.waveHeight;
    this.material.uniforms.iColorMode.value = controls.colorMode;
  }
}

// Create and initialize effect
const effect = new ColorWaveEffect();
initializeEffect(() => {
  console.log("[ColorWave] Initializing");
  effect.initialize();
});

export default effect;
```

### Key Techniques

- **Sine Wave Generation**: Using sine functions to create smooth wave motion
- **Dynamic Color Schemes**: Multiple color palettes with smooth transitions
- **Normalized Coordinates**: Using UV coordinates for resolution-independent effects
- **Decorator-Based Controls**: TypeScript decorators for defining user controls

## 🎵 Audio Reactive Pulse

A pulsing effect that reacts to audio input from SignalRGB.

### Preview

```
   ⚪       ⚪
  ⚪⚪⚪   ⚪⚪⚪
 ⚪⚪⚪⚪⚪⚪⚪⚪⚪
⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪
 ⚪⚪⚪⚪⚪⚪⚪⚪⚪
  ⚪⚪⚪   ⚪⚪⚪
   ⚪       ⚪
```

> _Note: This example shows how to integrate with SignalRGB's audio input capabilities._

### Fragment Shader

```glsl
// effects/audio-pulse/fragment.glsl

uniform float iTime;
uniform vec2 iResolution;
uniform float iAudioLevel;
uniform float iBasePulse;
uniform float iColorShift;
uniform float iIntensity;

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Center coordinates
  vec2 uv = fragCoord / iResolution.xy;
  vec2 center = uv - 0.5;
  float dist = length(center);

  // Audio-reactive pulse
  float pulse = iBasePulse + iAudioLevel;

  // Create pulse effect with smooth falloff
  float brightness = smoothstep(pulse, 0.0, dist) * iIntensity;

  // Color based on angle and time
  float angle = atan(center.y, center.x);
  float hue = fract((angle / 6.28) + iTime * iColorShift);

  // Final color
  vec3 color = hsv2rgb(vec3(hue, 0.8, brightness));

  // Output
  fragColor = vec4(color, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### Implementation Overview

Instead of showing the full implementation, here's a summary of how to implement this with decorators:

```typescript
@Effect({
  name: "Audio Pulse",
  description: "A pulsing effect that reacts to audio",
  author: "YourName",
})
export class AudioPulseEffect extends WebGLEffect<AudioPulseControls> {
  @NumberControl({
    label: "Base Pulse Size",
    min: 10,
    max: 50,
    default: 30,
    tooltip: "Base size of the pulse circle",
  })
  basePulse!: number;

  @NumberControl({
    label: "Color Shift Speed",
    min: 0,
    max: 10,
    default: 5,
    tooltip: "Speed of color rotation",
  })
  colorShift!: number;

  @NumberControl({
    label: "Intensity",
    min: 50,
    max: 200,
    default: 100,
    tooltip: "Brightness of the effect",
  })
  intensity!: number;

  // Override onFrame to access audio data
  protected onFrame(time: number): void {
    super.onFrame(time);

    // Get audio data from SignalRGB
    if (window.engine && window.engine.audio) {
      const audioLevel = window.engine.audio.level || -100;
      const normalizedLevel =
        Math.min(1, Math.max(0, (audioLevel + 50) / 50)) * 0.5;

      // Update audio-related uniform
      if (this.material) {
        this.material.uniforms.iAudioLevel.value = normalizedLevel;
      }
    }
  }
}
```

### Key Techniques

- **Audio Input**: Accessing SignalRGB's audio level data
- **Radial Gradients**: Creating pulse effects using distance from center
- **Color Cycling**: Shifting hues based on angle for a rainbow effect
- **Custom Frame Logic**: Overriding the onFrame method to process audio data

## 🌠 Rainbow Starfield

A classic star field effect with color and motion controls.

### Preview

```
  *       *     *
       *     *
*    *      *     *
     *  *       *
  *      *    *
       *    *      *
```

### Implementation Overview

You would implement this using the decorator pattern as follows:

```typescript
@Effect({
  name: "Rainbow Starfield",
  description: "A classic starfield with rainbow colors",
  author: "YourName",
})
export class RainbowStarfieldEffect extends WebGLEffect<StarfieldControls> {
  @NumberControl({
    label: "Star Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls how fast stars move",
  })
  speed!: number;

  @NumberControl({
    label: "Star Density",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Number of stars",
  })
  starDensity!: number;

  @NumberControl({
    label: "Star Size",
    min: 1,
    max: 10,
    default: 3,
    tooltip: "Size of stars",
  })
  starSize!: number;

  @ComboboxControl({
    label: "Color Mode",
    values: ["White", "Rainbow", "Blue", "Gold"],
    default: "Rainbow",
    tooltip: "Color scheme for stars",
  })
  colorMode!: string;
}
```

### Key Techniques

- **Procedural Star Generation**: Using hash functions for consistent random positioning
- **Multi-layered Parallax**: Different star layers moving at different speeds
- **Star Shape Rendering**: Custom star function with flare effect

## 🔥 Fire Effect

A realistic fire simulation effect.

### Preview

```
      ^
     ^^^
    ^^^^^
   ^^^^^^^
  ^^^^^^^^^
 ^^^^^^^^^^^
^^^^^^^^^^^^^
```

### Implementation Overview

Implement using decorators as follows:

```typescript
@Effect({
  name: "Fire Effect",
  description: "A realistic fire simulation",
  author: "YourName",
})
export class FireEffect extends WebGLEffect<FireEffectControls> {
  @NumberControl({
    label: "Animation Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls how fast the fire animates",
  })
  speed!: number;

  @NumberControl({
    label: "Intensity",
    min: 50,
    max: 150,
    default: 100,
    tooltip: "Brightness of the flames",
  })
  intensity!: number;

  @NumberControl({
    label: "Flame Height",
    min: 10,
    max: 100,
    default: 50,
    tooltip: "Controls how high the flames reach",
  })
  flameHeight!: number;

  @NumberControl({
    label: "Detail Level",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls the amount of detail in flames",
  })
  flameDetail!: number;
}
```

### Key Techniques

- **Fractional Brownian Motion**: Layered noise for natural fire movement
- **Custom Fire Shape**: Using power functions to create flame shapes
- **Fire Color Palette**: Non-linear color mapping for realistic fire appearance

## ✨ Glowing Particles (Canvas 2D)

A vibrant particle system with glowing effects using Canvas 2D rendering.

### Preview

```
  ✨    ✨
     ✨     ✨  ✨
 ✨        ✨
✨  ✨   ✨      ✨
   ✨     ✨  ✨
  ✨    ✨     ✨
```

### Effect Structure

```
effects/glow-particles/
├── glow-particles-effect.ts  # Main implementation
├── main.ts                   # Entry point
└── types.ts                  # Type definitions
```

### Canvas Effect Implementation Overview

Using the decorator-based approach:

```typescript
@Effect({
  name: "Glow Particles",
  description: "A vibrant particle system with glowing effects",
  author: "YourName",
})
export class GlowParticlesEffect extends CanvasEffect<GlowParticlesControls> {
  private particles: Particle[] = [];

  @NumberControl({
    label: "Particle Count",
    min: 10,
    max: 500,
    default: 100,
    tooltip: "Number of particles in the system",
  })
  particleCount!: number;

  @NumberControl({
    label: "Movement Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls how fast particles move",
  })
  speed!: number;

  @NumberControl({
    label: "Particle Size",
    min: 1,
    max: 20,
    default: 5,
    tooltip: "Size of particles",
  })
  particleSize!: number;

  @ComboboxControl({
    label: "Color Mode",
    values: ["Rainbow", "Blues", "Neon", "Fire"],
    default: "Rainbow",
    tooltip: "Color scheme for particles",
  })
  colorMode!: string;

  @NumberControl({
    label: "Glow Intensity",
    min: 10,
    max: 100,
    default: 50,
    tooltip: "Controls the glow effect intensity",
  })
  glowIntensity!: number;

  // Implementation details would follow...
}
```

### Key Techniques

- **Canvas 2D Rendering**: Using standard Canvas API instead of WebGL
- **Particle System**: Managing a collection of particles with physics
- **Trail Effects**: Using semi-transparent background fills for motion trails
- **Glow Effects**: Using Canvas shadow properties for light bloom
- **Delta Time**: Using time between frames to ensure consistent animation speeds

## 🔧 Tips & Tricks

### Performance Optimization

1. **Limit Complex Math**: Expensive functions like sin, cos, pow can slow down your effect

   ```glsl
   // Instead of this (expensive)
   float result = pow(sin(x * 10.0), 5.0);

   // Try this (more efficient)
   float sinx = sin(x * 10.0);
   float result = sinx * sinx * sinx * sinx * sinx;
   ```

2. **Use Texture Lookups**: For complex patterns, precalculate and use texture lookups

3. **Avoid Loops**: Unroll loops when possible or keep iterations minimal

### Visual Quality

1. **Color Spaces**: HSV is often more intuitive than RGB for creating color gradients

   ```glsl
   // HSV for better color control
   vec3 color = hsv2rgb(vec3(hue, saturation, brightness));
   ```

2. **Smooth Transitions**: Use smoothstep instead of step for smoother edges

3. **Gamma Correction**: Apply `pow(color, vec3(1.0/2.2))` for more accurate colors

### Decorator Best Practices

1. **Meaningful Defaults**: Set defaults that produce a good-looking effect right away

2. **Appropriate Ranges**: Set min/max values that prevent breaking the effect

3. **Clear Tooltips**: Provide descriptive tooltips for complex controls

4. **Logical Grouping**: Keep related controls together in your class definition
