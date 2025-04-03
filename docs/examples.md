# 🎮 LightScript Effect Examples

<div align="center">

![Examples](https://img.shields.io/badge/RGB-Examples-05FFA1?style=for-the-badge)

</div>

> *Conjure digital rainbows with these magical examples* ✨

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
├── main.ts        # Effect implementation
└── template.html  # HTML template with controls
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

import { BaseEffect } from "../../common/effect";
import {
  normalizeSpeed,
  normalizePercentage,
  getControlValue,
} from "../../common/controls";
import { initializeEffect } from "../../common";
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
export class ColorWaveEffect extends BaseEffect<ColorWaveControls> {
  // Color mode options
  private readonly colorModes = ["Rainbow", "Ocean", "Fire", "Neon"];

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
    const rawColorMode = getControlValue<string | number>(
      "colorMode",
      "Rainbow"
    );
    let colorMode: string | number = rawColorMode;

    if (typeof colorMode === "string") {
      const modeIndex = this.colorModes.indexOf(colorMode);
      colorMode = modeIndex === -1 ? 0 : modeIndex;
    }

    return {
      speed: normalizeSpeed(getControlValue<number>("speed", 5)),
      waveWidth: getControlValue<number>("waveWidth", 5),
      waveHeight: normalizePercentage(
        getControlValue<number>("waveHeight", 50),
        100,
        0.05
      ),
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

### HTML Template

```html
<!-- effects/color-wave/template.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Color Wave</title>
    <meta
      name="description"
      content="A flowing wave of color"
    />
    <meta name="keywords" content="SignalRGB, wave, color, effect" />
    <meta publisher="LightScript Workshop" />

    <!-- Controls -->
    <meta
      property="speed"
      label="Animation Speed"
      type="number"
      min="1"
      max="10"
      default="5"
      tooltip="Controls how fast the wave moves"
    />
    <meta
      property="waveWidth"
      label="Wave Width"
      type="number"
      min="1"
      max="20"
      default="5"
      tooltip="Number of wave cycles across the width"
    />
    <meta
      property="waveHeight"
      label="Wave Height"
      type="number"
      min="10"
      max="100"
      default="50"
      tooltip="Controls the maximum height of the wave (percentage)"
    />
    <meta
      property="colorMode"
      label="Color Scheme"
      type="combobox"
      values="Rainbow,Ocean,Fire,Neon"
      default="Rainbow"
      tooltip="Select the color palette for the effect"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background-color: #000;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <canvas id="exCanvas" width="320" height="200"></canvas>
    <script>
      <!-- BUNDLE_SCRIPT_INJECT -->
    </script>
  </body>
</html>
```

### Key Techniques

- **Sine Wave Generation**: Using sine functions to create smooth wave motion
- **Dynamic Color Schemes**: Multiple color palettes with smooth transitions
- **Normalized Coordinates**: Using UV coordinates for resolution-independent effects

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

> *Note: This example shows how to integrate with SignalRGB's audio input capabilities.*

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

### TypeScript Implementation

```typescript
// effects/audio-pulse/main.ts

import { BaseEffect } from "../../common/effect";
import {
  normalizeSpeed,
  normalizePercentage,
  getControlValue,
} from "../../common/controls";
import { initializeEffect } from "../../common";
import * as THREE from "three";

// Import shader
import fragmentShader from "./fragment.glsl";

// Control interface
export interface AudioPulseControls {
  basePulse: number;
  colorShift: number;
  intensity: number;
}

/**
 * AudioPulse effect implementation
 */
export class AudioPulseEffect extends BaseEffect<AudioPulseControls> {
  constructor() {
    super({
      id: "audio-pulse",
      name: "Audio Pulse",
      debug: true,
      fragmentShader,
    });
  }
  
  /**
   * Initialize controls
   */
  protected initializeControls(): void {
    window.basePulse = 30;
    window.colorShift = 5;
    window.intensity = 100;
  }
  
  /**
   * Get control values
   */
  protected getControlValues(): AudioPulseControls {
    return {
      basePulse: getControlValue<number>("basePulse", 30) / 100,
      colorShift: normalizeSpeed(getControlValue<number>("colorShift", 5)) / 10,
      intensity: normalizePercentage(getControlValue<number>("intensity", 100)),
    };
  }
  
  /**
   * Create uniforms
   */
  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iAudioLevel: { value: 0.0 },
      iBasePulse: { value: 0.3 },
      iColorShift: { value: 0.5 },
      iIntensity: { value: 1.0 },
    };
  }
  
  /**
   * Update uniforms
   */
  protected updateUniforms(controls: AudioPulseControls): void {
    if (!this.material) return;
    
    this.material.uniforms.iBasePulse.value = controls.basePulse;
    this.material.uniforms.iColorShift.value = controls.colorShift;
    this.material.uniforms.iIntensity.value = controls.intensity;
  }
  
  /**
   * Override onFrame to get audio input from SignalRGB
   */
  protected onFrame(time: number): void {
    super.onFrame(time);
    
    // Read audio level from SignalRGB if available
    let audioLevel = 0;
    
    if (window.engine && window.engine.audio) {
      // Convert from dB (-100 to 0) to linear (0 to 1)
      const dbLevel = window.engine.audio.level || -100;
      audioLevel = Math.min(1, Math.max(0, (dbLevel + 50) / 50)) * 0.5;
    }
    
    if (this.material) {
      this.material.uniforms.iAudioLevel.value = audioLevel;
    }
  }
}

// Create and initialize effect
const effect = new AudioPulseEffect();
initializeEffect(() => effect.initialize());

export default effect;
```

### Key Techniques

- **Audio Input**: Accessing SignalRGB's audio level data
- **Radial Gradients**: Creating pulse effects using distance from center
- **Color Cycling**: Shifting hues based on angle for a rainbow effect

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

### Fragment Shader

```glsl
// effects/rainbow-stars/fragment.glsl

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform float iStarDensity;
uniform float iStarSize;
uniform int iColorMode;

// Random and noise functions
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Hash function for star positions
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Star function
float star(vec2 uv, float flare) {
  float d = length(uv);
  float m = iStarSize / d;
  
  float rays = max(0.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare;
  m = smoothstep(0.0, 1.0, m);
  return m;
}

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
  
  // Star field setup
  vec3 color = vec3(0.0);
  
  // Several layers of stars with different sizes and movement speeds
  for (int i = 0; i < 3; i++) {
    // Offset per layer
    float offset = float(i) / 3.0;
    
    // Moving coordinate system for parallax
    float speed = iSpeed * (1.0 + float(i)) * 0.5;
    float movementScale = 1.0 + float(i) * 0.2;
    vec2 scaledUV = uv * (0.5 + float(i) * 0.5);
    
    // Create grid for stars
    vec2 gv = fract(scaledUV + offset) - 0.5;
    vec2 id = floor(scaledUV + offset);
    
    // For each potential star position
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        // Neighbor cell
        vec2 offs = vec2(float(x), float(y));
        
        // Random position within cell
        vec2 cellId = id + offs;
        vec2 cellUV = gv - offs;
        
        // Random star brightness and size based on cell
        float cellHash = hash(cellId);
        
        // Only draw some stars based on density
        if (cellHash > (1.0 - iStarDensity * 0.5)) {
          // Star center position with random offset
          vec2 starPos = cellUV - (vec2(cellHash, fract(cellHash * 34.12)) - 0.5) * 0.5;
          
          // Draw star
          float brightnessFactor = smoothstep(0.4, 1.0, cellHash) * 0.8 + 0.2;
          float starBrightness = star(starPos, brightnessFactor);
          
          // Star color based on mode
          vec3 starColor;
          if (iColorMode == 0) {
            // White stars with slight color variation
            starColor = mix(vec3(0.8, 0.8, 1.0), vec3(1.0, 0.9, 0.8), cellHash);
          } else if (iColorMode == 1) {
            // Rainbow stars
            starColor = hsv2rgb(vec3(cellHash, 0.8, 1.0));
          } else if (iColorMode == 2) {
            // Blue-white stars
            starColor = mix(vec3(0.5, 0.5, 1.0), vec3(1.0, 1.0, 1.0), cellHash);
          } else {
            // Gold-orange stars
            starColor = mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 0.8, 0.4), cellHash);
          }
          
          // Add star to scene
          color += starColor * starBrightness;
        }
      }
    }
  }
  
  // Output
  fragColor = vec4(color, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
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

### Fragment Shader

```glsl
// effects/fire-effect/fragment.glsl

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform float iIntensity;
uniform float iFlameHeight;
uniform float iFlameDetail;

// Noise function adapted from Inigo Quilez
float hash(float n) { return fract(sin(n) * 1e4); }
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

float noise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 x) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100);
  // Rotate to reduce axial bias
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
  for (int i = 0; i < 5; ++i) {
    v += a * noise(x);
    x = rot * x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalized coordinates with aspect ratio correction
  vec2 uv = fragCoord / iResolution.xy;
  
  // Time variable
  float time = iTime * iSpeed;
  
  // Fire base at bottom
  float y = 1.0 - uv.y;
  
  // Generate noise
  vec2 q = vec2(uv.x, y * iFlameHeight);
  
  float strength = iFlameHeight;
  float f = 0.0;
  
  // Fire shape
  f = 1.0 - pow(abs(uv.y - 1.0), 2.0) * 2.5;
  
  // Fractal noise for flame
  f *= fbm(q * vec2(1.0, 2.0) + time * 0.5) * iFlameDetail;
  
  // Adjust by position (more fire at bottom)
  f *= 1.0 - pow(uv.y, 4.0);
  
  // Intensity control
  f *= iIntensity;
  
  // Color palette for fire
  vec3 color = vec3(1.5 * f, 1.5 * f * f * f, f * f * f * f * f * f);
  
  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));
  
  // Output
  fragColor = vec4(color, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### Key Techniques

- **Fractional Brownian Motion**: Layered noise for natural fire movement
- **Custom Fire Shape**: Using power functions to create flame shapes
- **Fire Color Palette**: Non-linear color mapping for realistic fire appearance

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
   ```glsl
   // Define lookup texture in createUniforms()
   iNoiseTexture: { value: createNoiseTexture() }
   
   // Then in shader, use texture lookup instead of calculation
   vec4 noise = texture2D(iNoiseTexture, uv);
   ```

3. **Avoid Loops**: Unroll loops when possible or keep iterations minimal
   ```glsl
   // Instead of this
   float sum = 0.0;
   for (int i = 0; i < 10; i++) {
     sum += calculateValue(i);
   }
   
   // Unroll for better performance
   float sum = calculateValue(0) + calculateValue(1) + calculateValue(2) +
               calculateValue(3) + calculateValue(4) + calculateValue(5) +
               calculateValue(6) + calculateValue(7) + calculateValue(8) +
               calculateValue(9);
   ```

### Visual Quality

1. **Color Spaces**: HSV is often more intuitive than RGB for creating color gradients
   ```glsl
   // HSV for better color control
   vec3 color = hsv2rgb(vec3(hue, saturation, brightness));
   ```

2. **Smooth Transitions**: Use smoothstep instead of step for smoother edges
   ```glsl
   // Hard edge (harsh)
   float edge = step(0.5, value);
   
   // Smooth edge (better looking)
   float edge = smoothstep(0.45, 0.55, value);
   ```

3. **Gamma Correction**: Apply `pow(color, vec3(1.0/2.2))` for more accurate colors
   ```glsl
   // Apply gamma correction as the final step
   color = pow(color, vec3(1.0/2.2));
   ```

### Code Organization

1. **Utility Functions**: Create reusable functions for common operations
   ```glsl
   // Reusable functions for cleaner code
   float circle(vec2 uv, vec2 center, float radius) {
     return smoothstep(radius + 0.005, radius - 0.005, length(uv - center));
   }
   ```

2. **Normalized Coordinates**: Always work with normalized (0-1) coordinates for resolution independence
   ```glsl
   // Normalize coordinates
   vec2 uv = fragCoord / iResolution.xy;
   
   // Center if needed
   vec2 centered = uv - 0.5;
   ```

3. **Control Grouping**: Group related controls together in your HTML template
   ```html
   <!-- Group related controls with similar prefixes -->
   <meta property="waveWidth" ... />
   <meta property="waveHeight" ... />
   <meta property="waveSpeed" ... />
   ```

### Testing

1. **Start Simple**: Begin with a basic effect and add complexity incrementally
2. **Test on Hardware**: Effects can look different on actual RGB devices than in the preview
3. **Vary Device Layout**: Test with different device arrangements to ensure your effect scales well
