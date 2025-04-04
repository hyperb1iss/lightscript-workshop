# 🧙‍♀️ LightScript Workshop Advanced Guide

<div align="center">

![Advanced Guide](https://img.shields.io/badge/Advanced-Techniques-9C59D1?style=for-the-badge)

_Mastering the arcane arts of RGB illumination_

</div>

This guide explores advanced techniques for creating sophisticated RGB lighting effects with the LightScript Workshop framework. Here, we'll dive deeper into design patterns, optimization strategies, and advanced rendering methods that will elevate your effects to the next level.

## 📑 Table of Contents

- [Design Patterns](#-design-patterns)
- [Advanced Decorator Techniques](#-advanced-decorator-techniques)
- [Advanced Shader Techniques](#-advanced-shader-techniques)
- [Performance Optimization](#-performance-optimization)
- [Audio Reactivity](#-audio-reactivity)
- [Device-Aware Effects](#-device-aware-effects)
- [Build System & Plugins](#-build-system--plugins)
- [Debugging Complex Issues](#-debugging-complex-issues)

## 🧩 Design Patterns

Organizing your effect code using robust design patterns will make your effects more maintainable, modular, and powerful.

### Layered Effects Pattern

Compose complex effects by combining simpler ones:

```glsl
vec3 baseEffect(vec2 uv, float time) {
  // Simple effect like a gradient or solid color
  return mix(vec3(0.1, 0.2, 0.3), vec3(0.3, 0.4, 0.5), uv.y);
}

vec3 patternEffect(vec2 uv, float time) {
  // Pattern like stripes or dots
  return vec3(sin(uv.x * 20.0 + time) * 0.5 + 0.5);
}

vec3 highlightEffect(vec2 uv, float time) {
  // Highlight or accent effect
  float d = length(uv - vec2(0.5));
  return vec3(smoothstep(0.3, 0.29, d));
}

// In mainImage:
vec3 base = baseEffect(uv, iTime);
vec3 pattern = patternEffect(uv, iTime);
vec3 highlight = highlightEffect(uv, iTime);

// Compose the final color
vec3 finalColor = base;
finalColor = mix(finalColor, pattern, patternOpacity);
finalColor = finalColor + highlight * highlightIntensity;
```

### State Machine Pattern

For effects with distinct visual states:

```typescript
@Effect({
  name: "Multi-State Effect",
  description: "Effect with different visual states",
  author: "YourName",
})
class MultiStateEffect extends WebGLEffect<MyControls> {
  private state: "idle" | "active" | "transition" = "idle";
  private stateTime = 0;
  private lastTime = 0;

  @BooleanControl({
    label: "Activate Effect",
    default: false,
    tooltip: "Switch between idle and active states",
  })
  activated!: boolean;

  protected onFrame(time: number): void {
    // Calculate delta time
    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    // Update state based on controls
    if (window.activated && this.state === "idle") {
      this.state = "transition";
      this.stateTime = 0;
    } else if (!window.activated && this.state === "active") {
      this.state = "transition";
      this.stateTime = 0;
    }

    // Update state time
    this.stateTime += deltaTime;

    // Complete transitions
    if (this.state === "transition" && this.stateTime > 1.0) {
      this.state = window.activated ? "active" : "idle";
    }

    // Update uniforms based on state
    if (this.material) {
      this.material.uniforms.stateValue.value =
        this.state === "idle"
          ? 0.0
          : this.state === "transition"
            ? this.stateTime
            : 1.0;
    }

    super.onFrame(time);
  }
}
```

### Timeline Pattern

Create complex, precisely timed sequences:

```typescript
interface TimelineKeyframe {
  time: number;
  values: Record<string, any>;
}

class Timeline {
  private keyframes: TimelineKeyframe[] = [];
  private duration = 0;
  private loop = true;

  addKeyframe(time: number, values: Record<string, any>): void {
    this.keyframes.push({ time, values });
    this.keyframes.sort((a, b) => a.time - b.time);
    this.duration = Math.max(this.duration, time);
  }

  getValuesAtTime(time: number): Record<string, any> {
    // For looping timelines
    if (this.loop) {
      time = time % this.duration;
    }

    // Find surrounding keyframes
    let prevKeyframe: TimelineKeyframe | null = null;
    let nextKeyframe: TimelineKeyframe | null = null;

    for (const keyframe of this.keyframes) {
      if (keyframe.time <= time) {
        prevKeyframe = keyframe;
      } else {
        nextKeyframe = keyframe;
        break;
      }
    }

    // Handle edge cases
    if (!prevKeyframe) return this.keyframes[0].values;
    if (!nextKeyframe) return prevKeyframe.values;

    // Interpolate between keyframes
    const t =
      (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
    const result: Record<string, any> = {};

    // Interpolate each value
    Object.keys(prevKeyframe.values).forEach((key) => {
      if (typeof prevKeyframe!.values[key] === "number") {
        result[key] = lerp(
          prevKeyframe!.values[key],
          nextKeyframe!.values[key],
          t,
        );
      } else {
        result[key] =
          t < 0.5 ? prevKeyframe!.values[key] : nextKeyframe!.values[key];
      }
    });

    return result;
  }
}

// Helper function for linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Usage in effect with decorators
@Effect({
  name: "Timeline Effect",
  description: "Effect with keyframe animation",
  author: "YourName",
})
class TimelineEffect extends WebGLEffect<MyControls> {
  private timeline = new Timeline();

  constructor() {
    super({
      id: "timeline-effect",
      name: "Timeline Effect",
      fragmentShader,
    });

    // Create animation timeline
    this.timeline.addKeyframe(0, { intensity: 0, color: [1, 0, 0] });
    this.timeline.addKeyframe(1, { intensity: 1, color: [0, 1, 0] });
    this.timeline.addKeyframe(3, { intensity: 0.5, color: [0, 0, 1] });
  }

  protected onFrame(time: number): void {
    super.onFrame(time);

    // Get values at current time
    const timeValues = this.timeline.getValuesAtTime(time);

    // Update uniforms
    if (this.material) {
      this.material.uniforms.intensity.value = timeValues.intensity;
      this.material.uniforms.color.value = timeValues.color;
    }
  }
}
```

## 🔧 Advanced Decorator Techniques

The decorator-based control system opens up many powerful possibilities for creating richer effects.

### Custom Control Groups

You can create logical groups of controls using class organization and naming conventions:

```typescript
@Effect({
  name: "Advanced Particle System",
  description: "Particle system with advanced controls",
  author: "YourName",
})
class AdvancedParticleEffect extends WebGLEffect<AdvancedControls> {
  // Particle appearance controls
  @NumberControl({
    label: "Particle Size",
    min: 1,
    max: 20,
    default: 5,
    tooltip: "Size of particles",
  })
  particleSize!: number;

  @NumberControl({
    label: "Particle Count",
    min: 10,
    max: 1000,
    default: 100,
    tooltip: "Number of particles",
  })
  particleCount!: number;

  @ColorControl({
    label: "Particle Color",
    default: "#ff71ce",
    tooltip: "Base color of particles",
  })
  particleColor!: string;

  // Particle physics controls
  @NumberControl({
    label: "Gravity",
    min: -10,
    max: 10,
    default: 1,
    tooltip: "Gravitational force applied to particles",
  })
  gravity!: number;

  @NumberControl({
    label: "Wind Force",
    min: -10,
    max: 10,
    default: 0,
    tooltip: "Horizontal force applied to particles",
  })
  windForce!: number;

  @BooleanControl({
    label: "Bounce off Edges",
    default: true,
    tooltip: "Whether particles bounce off screen edges",
  })
  bounceOffEdges!: boolean;
}
```

### Computed Control Values

Create derived values from your decorated control properties:

```typescript
@Effect({
  name: "Computed Controls Demo",
  description: "Shows how to use computed values",
  author: "YourName",
})
class ComputedControlsEffect extends WebGLEffect<ComputedControls> {
  @NumberControl({
    label: "Base Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Base animation speed",
  })
  baseSpeed!: number;

  @NumberControl({
    label: "Speed Multiplier",
    min: 1,
    max: 5,
    default: 1,
    tooltip: "Multiplier applied to base speed",
  })
  speedMultiplier!: number;

  // No decorator - this is computed
  private get effectiveSpeed(): number {
    return (window.baseSpeed || 5) * (window.speedMultiplier || 1) * 0.2;
  }

  protected updateUniforms(controls: ComputedControls): void {
    if (!this.material) return;

    // Use the computed value
    this.material.uniforms.iSpeed.value = this.effectiveSpeed;
    // Other updates...
  }
}
```

### Decorator Inheritance

When creating a common base class for multiple effects, you can define shared controls:

```typescript
// Base class with common controls
abstract class AudioReactiveBase<T> extends WebGLEffect<T> {
  @NumberControl({
    label: "Audio Reactivity",
    min: 0,
    max: 100,
    default: 50,
    tooltip: "How strongly the effect reacts to audio",
  })
  audioReactivity!: number;

  @BooleanControl({
    label: "Bass Only",
    default: false,
    tooltip: "Only react to bass frequencies",
  })
  bassOnly!: boolean;

  protected getAudioLevel(): number {
    if (!window.engine || !window.engine.audio) return 0;

    let level = 0;
    if (window.bassOnly) {
      // Get only bass frequencies
      level = window.engine.audio.bassLevel || 0;
    } else {
      // Get overall audio level
      level = window.engine.audio.level || 0;
    }

    // Normalize and scale by reactivity
    return (
      Math.min(1, Math.max(0, (level + 50) / 50)) *
      ((window.audioReactivity || 50) / 100)
    );
  }
}

// Concrete implementation with additional controls
@Effect({
  name: "Audio Visualizer",
  description: "Audio reactive visualizer",
  author: "YourName",
})
class AudioVisualizerEffect extends AudioReactiveBase<VisualizerControls> {
  @ComboboxControl({
    label: "Visualization Style",
    values: ["Bars", "Circles", "Waves"],
    default: "Bars",
    tooltip: "Visual style of the audio visualization",
  })
  visualStyle!: string;

  // Implementation...
}
```

### Dynamic Control Visibility

While the framework doesn't directly support conditional control visibility, you can implement it in your effect logic:

```typescript
@Effect({
  name: "Dynamic Controls",
  description: "Controls that affect each other",
  author: "YourName",
})
class DynamicControlsEffect extends WebGLEffect<DynamicControls> {
  @ComboboxControl({
    label: "Effect Type",
    values: ["Simple", "Advanced", "Experimental"],
    default: "Simple",
    tooltip: "Type of effect to display",
  })
  effectType!: string;

  @NumberControl({
    label: "Advanced Iterations",
    min: 1,
    max: 10,
    default: 3,
    tooltip: "Number of iterations (Advanced and Experimental only)",
  })
  advancedIterations!: number;

  @ColorControl({
    label: "Experimental Color",
    default: "#01cdfe",
    tooltip: "Special color for Experimental mode",
  })
  experimentalColor!: string;

  protected updateUniforms(controls: DynamicControls): void {
    if (!this.material) return;

    // Base uniforms
    this.material.uniforms.iEffectType.value = this.getEffectTypeValue(
      window.effectType as string,
    );

    // Only use advanced iterations if in Advanced or Experimental mode
    if (
      window.effectType === "Advanced" ||
      window.effectType === "Experimental"
    ) {
      this.material.uniforms.iIterations.value = window.advancedIterations || 3;
    } else {
      this.material.uniforms.iIterations.value = 1; // Simple mode always uses 1
    }

    // Only apply experimental color in Experimental mode
    if (window.effectType === "Experimental") {
      this.material.uniforms.iSpecialColor.value = this.hexToRgb(
        (window.experimentalColor as string) || "#01cdfe",
      );
    }
  }

  private getEffectTypeValue(type: string): number {
    switch (type) {
      case "Simple":
        return 0;
      case "Advanced":
        return 1;
      case "Experimental":
        return 2;
      default:
        return 0;
    }
  }

  private hexToRgb(hex: string): THREE.Vector3 {
    // Convert hex to rgb and return as Vector3...
    return new THREE.Vector3(1, 0, 1); // Placeholder
  }
}
```

## 🧙‍♂️ Advanced Shader Techniques

Elevate your visual effects with these advanced shader techniques.

### Domain Warping

Create organic, flowing distortions:

```glsl
// Basic 2D noise function
float noise(vec2 p) {
  // Simple value noise implementation
  vec2 i = floor(p);
  vec2 f = fract(p);

  // 4 corners of unit square
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  // Smooth interpolation
  vec2 u = f * f * (3.0 - 2.0 * f);

  // Mix the 4 corners
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Domain warping function
vec2 warpDomain(vec2 p, float strength) {
  // Calculate warp offset
  float nx = noise(p);
  float ny = noise(p + vec2(100.0, 100.0));

  // Create warp vector
  vec2 warp = vec2(nx, ny) * 2.0 - 1.0;

  // Apply warp
  return p + warp * strength;
}

// Usage in your effect
vec2 p = uv * 10.0; // Base domain
p = warpDomain(p, 1.0); // First warp
p = warpDomain(p, 0.5); // Second warp (compound effect)

// Use warped coordinates for your effect
float value = noise(p);
```

### Signed Distance Fields

Create crisp, resolution-independent shapes:

```glsl
// Signed distance field for a circle
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// SDF for rectangle
float sdRect(vec2 p, vec2 size) {
  vec2 d = abs(p) - size;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Combine distance fields
float opUnion(float d1, float d2) {
  return min(d1, d2);
}

float opIntersection(float d1, float d2) {
  return max(d1, d2);
}

float opSubtraction(float d1, float d2) {
  return max(d1, -d2);
}

// Smooth blend
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Usage in shader
vec2 p = (uv - 0.5) * 2.0; // Center and normalize coords
float d = sdCircle(p, 0.5); // Create circle
d = opUnion(d, sdRect(p + vec2(0.2, 0.2), vec2(0.2))); // Add rectangle

// Render shape with anti-aliasing
float edge = fwidth(d) * 1.0;
float shape = smoothstep(edge, -edge, d);

vec3 color = mix(backgroundColor, shapeColor, shape);
```

### Ray Marching

Create 3D-like effects with ray marching:

```glsl
// Scene description - distance field
float map(vec3 p) {
  // Sphere
  float sphere = length(p) - 1.0;

  // Box
  vec3 boxP = p - vec3(2.0, 0.0, 0.0);
  vec3 q = abs(boxP) - vec3(0.5);
  float box = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);

  // Union of shapes
  return min(sphere, box);
}

// Ray marching function
float rayMarch(vec3 ro, vec3 rd) {
  float t = 0.0;

  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);

    // Early termination - hit something
    if (d < 0.001) break;

    // Early termination - too far
    if (t > 100.0) break;

    // Step along the ray
    t += d;
  }

  return t;
}

// Normal calculation
vec3 getNormal(vec3 p) {
  const float eps = 0.001;
  vec2 e = vec2(eps, 0.0);

  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// Usage in mainImage
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  // Camera setup
  vec3 ro = vec3(0.0, 0.0, -3.0); // Ray origin (camera position)
  vec3 rd = normalize(vec3(uv, 1.0)); // Ray direction

  // Ray march
  float t = rayMarch(ro, rd);

  // Default - sky color
  vec3 color = vec3(0.7, 0.8, 0.9);

  // If we hit something
  if (t < 100.0) {
    // Calculate hit position
    vec3 p = ro + rd * t;

    // Calculate normal
    vec3 normal = getNormal(p);

    // Simple lighting
    float diff = max(dot(normal, vec3(0.57, 0.57, 0.57)), 0.0);
    color = vec3(diff);
  }

  // Output final color
  fragColor = vec4(color, 1.0);
}
```

## ⚡ Performance Optimization

Optimizing your effects is crucial for maintaining smooth performance across different devices.

### Shader Complexity Manager

Adjust shader complexity based on performance:

```typescript
class ShaderComplexityManager {
  private fpsCounter: FPSCounter;
  private targetFPS = 60;
  private complexityLevel = 2; // 0 = low, 1 = medium, 2 = high
  private lastMeasureTime = 0;
  private measureInterval = 2; // Seconds between measurements

  constructor() {
    this.fpsCounter = new FPSCounter();
  }

  update(time: number): void {
    // Only measure periodically to avoid constant changes
    if (time - this.lastMeasureTime < this.measureInterval) {
      return;
    }

    this.lastMeasureTime = time;
    const currentFPS = this.fpsCounter.getFPS();

    // Adjust complexity based on performance
    if (currentFPS < this.targetFPS * 0.8 && this.complexityLevel > 0) {
      this.complexityLevel--;
      console.log("Reducing shader complexity to level", this.complexityLevel);
    } else if (currentFPS > this.targetFPS * 0.95 && this.complexityLevel < 2) {
      this.complexityLevel++;
      console.log(
        "Increasing shader complexity to level",
        this.complexityLevel,
      );
    }
  }

  getComplexityLevel(): number {
    return this.complexityLevel;
  }
}

// In your effect:
const complexityManager = new ShaderComplexityManager();

// In render loop
complexityManager.update(time);
this.material.uniforms.complexityLevel.value =
  complexityManager.getComplexityLevel();
```

In your shader:

```glsl
uniform int iComplexityLevel; // 0 = low, 1 = medium, 2 = high

// Simplified noise function for low complexity
float simpleNoise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Medium complexity noise
float mediumNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = simpleNoise(i);
  float b = simpleNoise(i + vec2(1.0, 0.0));
  float c = simpleNoise(i + vec2(0.0, 1.0));
  float d = simpleNoise(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// High complexity noise
float highNoise(vec2 p) {
  // Fractal Brownian motion
  float result = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    result += amplitude * mediumNoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return result;
}

// Use appropriate function based on complexity level
float getNoise(vec2 p) {
  if (iComplexityLevel == 0) {
    return simpleNoise(p);
  } else if (iComplexityLevel == 1) {
    return mediumNoise(p);
  } else {
    return highNoise(p);
  }
}
```

### Shader Optimizations

1. **Minimize Trigonometric Functions**:

   ```glsl
   // Approximation of sin(x) for x in [0, π]
   float fastSin(float x) {
     float x2 = x * x;
     return x * (0.9996 - x2 * (0.1666 - x2 * 0.0083));
   }
   ```

2. **Use Texture Lookups**:

   ```glsl
   // Precompute complex functions in a texture
   uniform sampler2D iLookupTex;

   // Later in the shader
   float value = texture2D(iLookupTex, vec2(input, 0.5)).r;
   ```

3. **Avoid Branches**:

   ```glsl
   // Instead of branching
   float result;
   if (condition) {
     result = value1;
   } else {
     result = value2;
   }

   // Use mix for smoother performance
   float conditionFactor = float(condition); // 0.0 or 1.0
   float result = mix(value2, value1, conditionFactor);
   ```

4. **Reuse Calculations**:
   ```glsl
   // Don't compute the same value multiple times
   float sinX = sin(x);
   float cosX = cos(x);
   float result = sinX * variable1 + cosX * variable2;
   ```

## 🎵 Audio Reactivity

Create effects that react to audio input from SignalRGB.

### Accessing Audio Data

```typescript
@Effect({
  name: "Audio Reactive",
  description: "Responds to audio input",
  author: "YourName",
})
class AudioReactiveEffect extends WebGLEffect<AudioControls> {
  // Override onFrame to access audio data
  protected onFrame(time: number): void {
    super.onFrame(time);

    // Check if audio data is available
    if (window.engine && window.engine.audio) {
      // Get overall audio level (loudness)
      const audioLevel = window.engine.audio.level || -100;
      const normalizedLevel = Math.min(1, Math.max(0, (audioLevel + 50) / 50));

      // Get audio frequency data (full spectrum)
      const frequency = window.engine.audio.freq || new Int8Array(200);

      // Get audio density (tone roughness)
      const density = window.engine.audio.density || 0;

      // Get audio width (stereo width)
      const width = window.engine.audio.width || 0;

      // Update shader uniforms
      if (this.material) {
        this.material.uniforms.iAudioLevel.value = normalizedLevel;
        this.material.uniforms.iAudioDensity.value = density;
        this.material.uniforms.iAudioWidth.value = width;

        // Pass frequency data if needed
        // this.material.uniforms.iAudioFreq.value = frequency;
      }
    }
  }
}
```

### Frequency Analysis

```typescript
class FrequencyAnalyzer {
  // Frequency bands (in approximate Hz)
  private readonly bands = {
    bass: { min: 0, max: 15 }, // ~20-250 Hz
    midLow: { min: 15, max: 50 }, // ~250-500 Hz
    mid: { min: 50, max: 100 }, // ~500-2000 Hz
    midHigh: { min: 100, max: 150 }, // ~2000-4000 Hz
    high: { min: 150, max: 200 }, // ~4000-20000 Hz
  };

  analyze(frequency: Int8Array): Record<string, number> {
    const result: Record<string, number> = {};

    // Process each band
    for (const [band, range] of Object.entries(this.bands)) {
      let sum = 0;
      let count = 0;

      // Sum frequencies in this band
      for (let i = range.min; i < range.max && i < frequency.length; i++) {
        sum += Math.abs(frequency[i]);
        count++;
      }

      // Calculate average normalized value (0-1)
      result[band] = count > 0 ? Math.min(1, sum / count / 100) : 0;
    }

    return result;
  }
}

// Usage in effect
const analyzer = new FrequencyAnalyzer();

// In onFrame
if (window.engine && window.engine.audio && window.engine.audio.freq) {
  const bands = analyzer.analyze(window.engine.audio.freq);

  // Update shader uniforms
  if (this.material) {
    this.material.uniforms.iAudioBass.value = bands.bass;
    this.material.uniforms.iAudioMid.value = bands.mid;
    this.material.uniforms.iAudioHigh.value = bands.high;
  }
}
```

## 🖥️ Device-Aware Effects

Create effects that adapt to different types of RGB devices.

### Responsive Layouts

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float aspectRatio = iResolution.x / iResolution.y;

  // Adjust for different aspect ratios
  if (aspectRatio > 16.0/9.0) {
    // Ultrawide monitor or LED strip
    // Create horizontal effect
    float horizontalGradient = fract(uv.x * 5.0 - iTime * 0.1);
    fragColor = vec4(vec3(horizontalGradient), 1.0);
  } else if (aspectRatio > 1.0) {
    // Standard monitor or keyboard
    // Create radial effect
    vec2 center = uv - 0.5;
    float dist = length(center);
    float radialGradient = fract(dist * 5.0 - iTime * 0.1);
    fragColor = vec4(vec3(radialGradient), 1.0);
  } else {
    // Vertical device
    // Create vertical effect
    float verticalGradient = fract(uv.y * 5.0 - iTime * 0.1);
    fragColor = vec4(vec3(verticalGradient), 1.0);
  }
}
```

## 🔧 Build System & Plugins

LightScript Workshop uses a custom Vite-based build system with specialized plugins for producing SignalRGB-compatible effects.

### Core Build System

The build system is powered by Vite and enhanced with custom plugins designed specifically for SignalRGB compatibility:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import swcPlugin from "@vitejs/plugin-react-swc";

// Import our custom plugins
import {
  lightscriptDecoratorsPlugin,
  signalRGBPlugin,
  getEffectBuildConfig,
} from "./plugins";

export default defineConfig(({ command }) => {
  const isDevelopment = command === "serve";

  return {
    plugins: [
      // SWC with decorator support
      swcPlugin({
        tsDecorators: true,
      }),

      // SignalRGB HTML generation
      signalRGBPlugin(),

      // GLSL shader support
      glsl(),

      // Only add lightscript decorators plugin for development mode
      ...(isDevelopment ? [lightscriptDecoratorsPlugin()] : []),
    ],
    // Build configuration from effect settings
    build: getEffectBuildConfig(),
  };
});
```

### Decorator Support Plugin

This plugin enables TypeScript decorators to work correctly in development mode:

```typescript
// plugins/decorators.ts
export function lightscriptDecoratorsPlugin(): Plugin {
  return {
    name: "lightscript-decorators",
    transform(code, id) {
      // Apply to any TypeScript files that use decorators
      if (
        id.includes("/src/") &&
        id.endsWith(".ts") &&
        (code.includes("@Effect") ||
          code.includes("@NumberControl") ||
          code.includes("@BooleanControl") ||
          code.includes("@ComboboxControl"))
      ) {
        // Add reflect-metadata import if needed
        const hasReflectImport = code.includes('import "reflect-metadata"');

        let modifiedCode = code;
        if (!hasReflectImport) {
          modifiedCode = `import 'reflect-metadata';\n${code}`;
        }

        // Make sure symbols for decorators are preserved
        const keepSymbols = `
// Ensure decorator symbols are preserved
const DECORATOR_METADATA_SYMBOL = Symbol.for('lightscript:controls');
const EFFECT_METADATA_SYMBOL = Symbol.for('lightscript:effect');
`;

        return {
          code: keepSymbols + modifiedCode,
          map: null,
        };
      }
      return null;
    },
  };
}
```

### SignalRGB Plugin

This plugin automatically generates HTML files from your TypeScript code by extracting metadata from your decorators:

```typescript
// plugins/signalrgb.ts (simplified)
export function signalRGBPlugin(): Plugin {
  return {
    name: "signalrgb-plugin",
    apply: "build", // only apply during build

    // After build is complete
    closeBundle() {
      // Process effect files
      for (const effect of effects) {
        // Extract metadata from decorators
        const metadata = extractMetadataFromDecorators(effect);

        // Generate HTML template
        const template = generateSignalRGBTemplate(metadata);

        // Insert JavaScript bundle
        const bundlePath = `dist/${effect.id}.js`;
        const jsContent = fs.readFileSync(bundlePath, "utf-8");
        const finalHtml = insertBundleIntoTemplate(template, jsContent);

        // Write output HTML file
        fs.writeFileSync(`dist/${effect.id}.html`, finalHtml);
      }
    },
  };
}
```

### Using Build Commands

Building your effects for SignalRGB:

```bash
# Build a specific effect
EFFECT=awesome-wave npm run build

# Build all effects
npm run build

# Build with debug info (no minification)
NO_MINIFY=true EFFECT=awesome-wave npm run build:debug
```

## 🐞 Debugging Complex Issues

Advanced techniques for troubleshooting complex issues in your effects.

### Visual Debugging in Shaders

Use color output to visualize values:

```glsl
// Debug mode uniform
uniform bool iDebugMode;
uniform int iDebugView; // 0: normal, 1: uv, 2: distance, 3: normals...

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Normal effect calculation
  vec3 normalColor = calculateEffectColor(uv);

  // Debug visualizations
  if (iDebugMode) {
    if (iDebugView == 1) {
      // Visualize UV coordinates
      fragColor = vec4(uv.x, uv.y, 0.0, 1.0);
    } else if (iDebugView == 2) {
      // Visualize distance from center
      vec2 center = uv - 0.5;
      float dist = length(center);
      fragColor = vec4(vec3(dist), 1.0);
    } else if (iDebugView == 3) {
      // Visualize direction as color
      vec2 dir = normalize(uv - 0.5);
      fragColor = vec4(dir * 0.5 + 0.5, 0.0, 1.0);
    } else {
      // Default to normal rendering
      fragColor = vec4(normalColor, 1.0);
    }
  } else {
    // Normal rendering
    fragColor = vec4(normalColor, 1.0);
  }
}
```

### Debugging Controls

Create a debug UI for your controls:

```typescript
class ControlDebugger {
  private container: HTMLElement;
  private values: Record<string, HTMLElement> = {};

  constructor() {
    // Create debug container
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.top = '10px';
    this.container.style.right = '10px';
    this.container.style.background = 'rgba(0,0,0,0.7)';
    this.container.style.color = '#fff';
    this.container.style.padding = '10px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '12px';
    this.container.style.zIndex = '9999';
    this.container.style.maxHeight = '80vh';
    this.container.style.overflowY = 'auto';

    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Control Values';
    header.style.margin = '0 0 10px 0';
    this.container.appendChild(header);

    document.body.appendChild(this.container);
  }

  updateControl(id: string, value: unknown): void {
    // Create or update value display
    if (!this.values[id]) {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '5px';

      const label = document.createElement('span');
      label.textContent = `${id}: `;
      wrapper.appendChild(label);

      const valueEl = document.createElement('span');
      valueEl.style.color = '#0f0';
      wrapper.appendChild(valueEl);

      this.container.appendChild(wrapper);
      this.values[id] = valueEl;
    }

    // Format value for display
    let displayValue: string;
    if (typeof value === 'number') {
      displayValue = value.toFixed(4);
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'true' : 'false';
    } else {
      displayValue = String(value);
    }

    this.values[id].textContent = displayValue;
  }

  clear(): void {
    this.values = {};
    this.container.innerHTML = '';
  }
}

// In your effect:
const debugger = new ControlDebugger();

// In updateUniforms
protected updateUniforms(controls: MyControls): void {
  // Update debug display
  for (const [key, value] of Object.entries(controls)) {
    debugger.updateControl(key, value);
  }

  // Normal uniform updates...
}
```

### Performance Profiling

Add performance measurements to your effect:

```typescript
class PerformanceMeter {
  private framesCount = 0;
  private lastMeasureTime = 0;
  private measureInterval = 1000; // 1 second
  private lastFps = 0;

  private updateTimes: number[] = [];
  private renderTimes: number[] = [];

  measureFps(now: number): number {
    this.framesCount++;

    if (now - this.lastMeasureTime >= this.measureInterval) {
      this.lastFps = Math.round(this.framesCount * 1000 / (now - this.lastMeasureTime));
      this.framesCount = 0;
      this.lastMeasureTime = now;
    }

    return this.lastFps;
  }

  measureUpdateTime(callback: () => void): number {
    const start = performance.now();
    callback();
    const end = performance.now();
    const time = end - start;

    this.updateTimes.push(time);
    if (this.updateTimes.length > 60) {
      this.updateTimes.shift();
    }

    return time;
  }

  measureRenderTime(callback: () => void): number {
    const start = performance.now();
    callback();
    const end = performance.now();
    const time = end - start;

    this.renderTimes.push(time);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }

    return time;
  }

  getAverageUpdateTime(): number {
    if (this.updateTimes.length === 0) return 0;
    return this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;
  }

  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }
}

// In your effect
const perfMeter = new PerformanceMeter();

// Override update method
public update(force: boolean = false): void {
  perfMeter.measureUpdateTime(() => {
    super.update(force);
  });
}

// Override render method
protected onFrame(time: number): void {
  const now = performance.now();
  const fps = perfMeter.measureFps(now);

  // Log performance data periodically
  if (this.framesCount % 60 === 0) {
    console.log(`FPS: ${fps}, Update: ${perfMeter.getAverageUpdateTime().toFixed(2)}ms, Render: ${perfMeter.getAverageRenderTime().toFixed(2)}ms`);
  }

  perfMeter.measureRenderTime(() => {
    super.onFrame(time);
  });
}
```
