# ✨ LightScript Workshop Developer Guide ✨

<div align="center">

![Framework Banner](https://img.shields.io/badge/LightScript-Workshop-FF71CE?style=for-the-badge)

_The digital spellbook for creating stunning RGB lighting effects_

</div>

## 📖 Introduction

Welcome to the **LightScript Workshop** – your magic toolkit for creating spectacular RGB lighting effects for [SignalRGB](https://signalrgb.com/). This framework transforms the traditional development experience into a modern, type-safe environment with all the tools you need to create professional-quality effects.

If you've worked with SignalRGB's standard Lightscripts before, you'll find this framework elevates your development workflow with TypeScript, live reloading, structured components, and a streamlined build process. If you're new to RGB effect development, you'll find a welcoming, well-structured environment to bring your creative visions to life.

### Why This Framework Exists

Traditional SignalRGB Lightscripts can be cumbersome to develop:

- No type checking leads to runtime errors
- Limited debugging capabilities
- Repetitive boilerplate code
- Difficult to maintain complex effects

LightScript Workshop solves these issues by providing:

- **Type Safety** - Catch errors before they happen
- **Component Architecture** - Build complex effects with reusable parts
- **Modern Tooling** - Hot reload, debugging, and optimization
- **Three.js Integration** - Access to advanced WebGL capabilities
- **Decorator-Based Controls** - Define UI elements with TypeScript decorators

## 🚀 Getting Started

### Prerequisites

Before diving in, ensure you have:

- **[Node.js](https://nodejs.org/)** 16.x or higher
- **npm** or **yarn**
- **Code editor** (VS Code recommended)
- **[SignalRGB](https://signalrgb.com/)** (for testing on actual hardware)

### Installation

```bash
# Clone the repository
git clone https://github.com/hyperb1iss/lightscript-workshop.git
cd lightscript-workshop

# Install dependencies
npm install

# Start development server
npm run dev
```

After running the development server, visit http://localhost:3000 in your browser. You'll see the default effect running in the development environment.

To view a specific effect, add its ID to the URL:

```
http://localhost:3000?effect=simple-wave
```

## 🧩 Project Structure

Understanding the framework's structure will help you navigate and create effects efficiently:

```
src/
├── core/           # Framework core
│   ├── controls/   # Control system with decorators
│   ├── effects/    # Base effect classes
│   ├── utils/      # Shared utilities
│   └── index.ts    # Core exports
│
├── effects/        # Effect implementations
│   ├── puff-stuff/
│   │   ├── fragment.glsl
│   │   └── main.ts
│   │
│   └── simple-wave/
│       ├── fragment.glsl
│       └── main.ts
│
├── plugins/        # Vite plugins for build system
│
└── index.ts        # Effect registry
```

Each effect consists of primarily two files:

- **fragment.glsl** - The WebGL shader that creates your visual effect
- **main.ts** - TypeScript implementation using decorators and framework classes

## 💫 Core Concepts

Before creating your first effect, let's understand the core concepts of the framework.

### The Effect Lifecycle

1. **Initialization**: The effect loads and sets up rendering context
2. **Control Setup**: Default control values are established
3. **Animation Loop**: Continuous rendering based on time and inputs
4. **Control Updates**: React to user changes to controls
5. **Shutdown**: Clean up resources when the effect is closed

### Framework Architecture

LightScript Workshop uses a hierarchical structure for effects:

- **BaseEffect**: Abstract base class providing core functionality
  - **WebGLEffect**: Implementation using Three.js/WebGL for shader-based effects
  - **CanvasEffect**: Implementation using Canvas 2D for traditional drawing

This architecture lets you choose the right rendering approach for your effect's needs.

### BaseEffect Class

The `BaseEffect` class is the foundation for all effects. It handles:

- Rendering context initialization
- Animation loop management
- Control synchronization
- Effect parameter updates

When you create a new effect, you'll extend either `WebGLEffect` or `CanvasEffect` (both of which extend `BaseEffect`) and implement their required methods.

### WebGLEffect Class

For shader-based effects using WebGL, the `WebGLEffect` class provides:

- Three.js initialization
- Shader compilation
- Uniform management
- WebGL rendering setup

When extending `WebGLEffect`, you'll implement:

```typescript
// Initialize controls with default values
protected initializeControls(): void

// Get current control values
protected getControlValues(): T

// Create shader uniforms
protected createUniforms(): Record<string, THREE.IUniform>

// Update uniforms with control values
protected updateUniforms(controls: T): void
```

### CanvasEffect Class

For effects using the Canvas 2D API, the `CanvasEffect` class provides:

- 2D context initialization
- Delta time calculation
- Canvas clearing and state management
- Resource loading helpers

When extending `CanvasEffect`, you'll implement:

```typescript
// Initialize controls with default values
protected initializeControls(): void

// Get current control values
protected getControlValues(): T

// Draw the effect with canvas operations
protected draw(time: number, deltaTime: number): void

// Apply control values to the effect parameters
protected applyControls(controls: T): void
```

### Decorator-Based Control System

The most significant improvement in the framework is the decorator-based control system. Instead of defining controls in HTML templates, you now use TypeScript decorators directly in your effect class:

```typescript
@NumberControl({
  label: "Animation Speed",
  min: 1,
  max: 10,
  default: 5,
  tooltip: "Controls how fast the animation runs"
})
speed!: number;
```

The framework supports these control decorators:

- **@NumberControl** - Sliders with numeric values
- **@BooleanControl** - Checkbox toggles
- **@ComboboxControl** - Dropdown selections
- **@HueControl** - Hue picker control
- **@ColorControl** - Color picker control
- **@TextFieldControl** - Text input control

Additionally, the `@Effect` decorator provides metadata for your effect class:

```typescript
@Effect({
  name: "Awesome Wave",
  description: "A colorful wave effect",
  author: "YourName",
})
export class AwesomeWaveEffect extends WebGLEffect<AwesomeWaveControls> {
  // ...
}
```

## 🎨 Creating Your First Effect

Let's create your first effect. You can choose between two rendering approaches based on your needs:

1. **WebGL Effect**: For shader-based effects with high performance and visual complexity
2. **Canvas 2D Effect**: For traditional drawing-based effects or when you need simpler rendering

### Creating a WebGL Effect

Let's create a simple wave effect using WebGL and shaders:

#### 1. Create the Directory Structure

```bash
mkdir -p src/effects/awesome-wave
```

#### 2. Create the Fragment Shader

Create `fragment.glsl` with your WebGL shader code:

```glsl
uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform int iColorMode;
uniform float iWaveHeight;

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Get color based on color mode
vec3 getColor(float pos, int mode) {
  // Rainbow colors
  if (mode == 0) {
    return hsv2rgb(vec3(pos, 0.8, 1.0));
  }
  // Ocean colors
  else if (mode == 1) {
    return mix(vec3(0.0, 0.3, 0.8), vec3(0.0, 0.8, 1.0),
               sin(pos * 6.28) * 0.5 + 0.5);
  }
  // Fire colors
  else if (mode == 2) {
    return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.2, 0.0),
               sin(pos * 6.28) * 0.5 + 0.5);
  }
  // Neon colors
  else if (mode == 3) {
    float segment = floor(pos * 4.0) / 4.0;
    float t = fract(pos * 4.0);

    if (segment < 0.25) {
      return mix(vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), t);
    } else if (segment < 0.5) {
      return mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), t);
    } else if (segment < 0.75) {
      return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.5), t);
    } else {
      return mix(vec3(1.0, 0.0, 0.5), vec3(1.0, 0.0, 1.0), t);
    }
  }

  // Default rainbow
  return hsv2rgb(vec3(pos, 0.8, 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalized coordinates
  vec2 uv = fragCoord / iResolution.xy;

  // Time-based animation
  float time = iTime * iSpeed;

  // Create wave effect
  float wave = sin(uv.x * 6.28 + time) * 0.5 + 0.5;

  // Apply wave height (as percentage of screen)
  wave = wave * (iWaveHeight / 100.0);

  // Get color based on x position and time
  float colorPos = fract(uv.x - time * 0.1);
  vec3 color = getColor(colorPos, iColorMode);

  // Apply wave height check
  if (uv.y < wave) {
    fragColor = vec4(color, 1.0);
  } else {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

#### 3. Create the TypeScript Implementation

Create `main.ts` to connect your shader to the framework using decorators:

```typescript
import { WebGLEffect } from "../../core/effects/webgl-effect";
import {
  Effect,
  NumberControl,
  ComboboxControl,
} from "../../core/controls/decorators";
import { normalizeSpeed, boolToInt } from "../../core/controls/helpers";
import { initializeEffect } from "../../core";
import * as THREE from "three";

// Import shader
import fragmentShader from "./fragment.glsl";

// Define control interface
export interface AwesomeWaveControls {
  speed: number;
  colorMode: string | number;
  waveHeight: number;
}

// Effect implementation with decorators
@Effect({
  name: "Awesome Wave",
  description: "A colorful wave effect",
  author: "YourName",
})
export class AwesomeWaveEffect extends WebGLEffect<AwesomeWaveControls> {
  // Color mode options for conversion
  private readonly colorModes = ["Rainbow", "Ocean", "Fire", "Neon"];

  // Define controls with decorators
  @NumberControl({
    label: "Animation Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls how fast the wave moves",
  })
  speed!: number;

  @ComboboxControl({
    label: "Color Scheme",
    values: ["Rainbow", "Ocean", "Fire", "Neon"],
    default: "Rainbow",
    tooltip: "Select the color palette",
  })
  colorMode!: string;

  @NumberControl({
    label: "Wave Height",
    min: 10,
    max: 100,
    default: 50,
    tooltip: "Controls the height of the wave",
  })
  waveHeight!: number;

  constructor() {
    super({
      id: "awesome-wave",
      name: "Awesome Wave",
      debug: true,
      fragmentShader,
    });
  }

  // Initialize controls with default values
  protected initializeControls(): void {
    window.speed = 5;
    window.colorMode = "Rainbow";
    window.waveHeight = 50;
  }

  // Get current control values
  protected getControlValues(): AwesomeWaveControls {
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
      colorMode,
      waveHeight: window.waveHeight ?? 50,
    };
  }

  // Create shader uniforms
  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iColorMode: { value: 0 },
      iWaveHeight: { value: 50.0 },
    };
  }

  // Update uniforms with control values
  protected updateUniforms(controls: AwesomeWaveControls): void {
    if (!this.material) return;

    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iColorMode.value = controls.colorMode;
    this.material.uniforms.iWaveHeight.value = controls.waveHeight;
  }
}

// Create and initialize the effect
const effect = new AwesomeWaveEffect();
initializeEffect(() => effect.initialize());

export default effect;
```

#### 4. Register Your Effect

Add your effect to the registry in `src/index.ts`:

```typescript
export const effects = [
  // Existing effects...
  {
    id: "awesome-wave",
    name: "Awesome Wave",
    description: "A colorful wave effect",
    author: "YourName",
    entry: "./effects/awesome-wave/main.ts",
  },
];
```

#### 5. Test Your Effect

Run the development server and navigate to your effect:

```bash
npm run dev
# Then open: http://localhost:3000?effect=awesome-wave
```

### Creating a Canvas 2D Effect

Now let's create a particle effect using the Canvas 2D API:

#### 1. Create the Directory Structure

```bash
mkdir -p src/effects/glow-particles
```

#### 2. Create the TypeScript Types

Create `types.ts` to define particle-related types:

```typescript
// src/effects/glow-particles/types.ts

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export interface GlowParticlesControls {
  particleCount: number;
  speed: number;
  particleSize: number;
  colorMode: string | number;
  glowIntensity: number;
}
```

#### 3. Create the Effect Implementation

Create `glow-particles-effect.ts` with the Canvas effect implementation using decorators:

```typescript
// src/effects/glow-particles/glow-particles-effect.ts

import { CanvasEffect } from "../../core/effects/canvas-effect";
import {
  Effect,
  NumberControl,
  ComboboxControl,
} from "../../core/controls/decorators";
import { normalizeSpeed } from "../../core/controls/helpers";
import { Particle, GlowParticlesControls } from "./types";

@Effect({
  name: "Glow Particles",
  description: "A colorful particle system with glowing effects",
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
    tooltip: "Controls particle movement speed",
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

  constructor() {
    super({
      id: "glow-particles",
      name: "Glow Particles",
      debug: true,
      backgroundColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent for trails
    });
  }

  /**
   * Initialize control default values
   */
  protected initializeControls(): void {
    window.particleCount = 100;
    window.speed = 5;
    window.particleSize = 5;
    window.colorMode = "Rainbow";
    window.glowIntensity = 50;
  }

  /**
   * Get current control values
   */
  protected getControlValues(): GlowParticlesControls {
    return {
      particleCount: window.particleCount ?? 100,
      speed: normalizeSpeed(window.speed ?? 5),
      particleSize: window.particleSize ?? 5,
      colorMode: window.colorMode ?? "Rainbow",
      glowIntensity: (window.glowIntensity ?? 50) / 50,
    };
  }

  /**
   * Set up initial particles after renderer is initialized
   */
  protected async initializeRenderer(): Promise<void> {
    await super.initializeRenderer();

    // Initialize particles
    this.createParticles(100);
  }

  /**
   * Apply control changes
   */
  protected applyControls(controls: GlowParticlesControls): void {
    // Adjust particle count if needed
    if (this.particles.length !== controls.particleCount) {
      this.createParticles(controls.particleCount);
    }

    // Other controls are applied during drawing
  }

  /**
   * Create particles
   */
  private createParticles(count: number): void {
    this.particles = [];

    if (!this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 4 + 1,
        color: this.getRandomColor((window.colorMode as string) || "Rainbow"),
        alpha: Math.random() * 0.5 + 0.5,
      });
    }
  }

  /**
   * Get random color based on color mode
   */
  private getRandomColor(colorMode: string): string {
    switch (colorMode) {
      case "Rainbow":
        return `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
      case "Blues":
        return `hsl(${200 + Math.floor(Math.random() * 40)}, 100%, ${50 + Math.floor(Math.random() * 30)}%)`;
      case "Neon":
        const neonHues = [320, 260, 180, 120]; // Pink, Purple, Cyan, Green
        return `hsl(${neonHues[Math.floor(Math.random() * neonHues.length)]}, 100%, 60%)`;
      case "Fire":
        return `hsl(${Math.floor(Math.random() * 30) + 10}, 100%, ${50 + Math.floor(Math.random() * 20)}%)`;
      default:
        return `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
    }
  }

  /**
   * Draw the particles on the canvas
   */
  protected draw(time: number, deltaTime: number): void {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const controls = this.getControlValues();

    // Draw background with fade effect
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(0, 0, width, height);

    // Configure glow effect
    this.ctx.shadowBlur = 15 * controls.glowIntensity;
    this.ctx.globalCompositeOperation = "lighter";

    // Draw each particle
    for (const particle of this.particles) {
      this.ctx.shadowColor = particle.color;
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.alpha;

      this.ctx.beginPath();
      this.ctx.arc(
        particle.x,
        particle.y,
        (particle.size * controls.particleSize) / 5,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      // Update position
      particle.x += particle.vx * controls.speed * deltaTime * 60;
      particle.y += particle.vy * controls.speed * deltaTime * 60;

      // Bounce off edges
      if (particle.x < 0 || particle.x > width) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > height) {
        particle.vy *= -1;
      }

      // Random color changes
      if (Math.random() < 0.01) {
        particle.color = this.getRandomColor(controls.colorMode as string);
      }
    }

    // Reset composite operation
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1;
  }
}
```

#### 4. Create the Entry Point

Create `main.ts` as the entry point for the effect:

```typescript
// src/effects/glow-particles/main.ts

import { initializeEffect } from "../../core";
import { GlowParticlesEffect } from "./glow-particles-effect";

// Create effect instance
const effect = new GlowParticlesEffect();

// Initialize the effect
initializeEffect(() => {
  console.log("[GlowParticles] Initializing");
  effect.initialize();
});

// Export the effect instance
export default effect;

// Re-export types and components
export { GlowParticlesEffect } from "./glow-particles-effect";
export type { GlowParticlesControls } from "./types";
```

#### 5. Register Your Effect

Add your effect to the registry in `src/index.ts`:

```typescript
export const effects = [
  // Existing effects...
  {
    id: "glow-particles",
    name: "Glow Particles",
    description: "A colorful particle system with glowing effects",
    author: "YourName",
    entry: "./effects/glow-particles/main.ts",
  },
];
```

#### 6. Test Your Effect

Run the development server and navigate to your effect:

```bash
npm run dev
# Then open: http://localhost:3000?effect=glow-particles
```

## 🔧 Development Workflow

Now that you've created your first effect, let's explore the typical development workflow:

### 1. Iterative Development

The development server supports hot reloading, so you can:

- Modify your shader code and see changes instantly
- Adjust control values through the UI
- Update TypeScript code and see it refresh automatically

### 2. Using the Debug Tools

Enable debug mode in your effect constructor to see helpful information:

```typescript
constructor() {
  super({
    id: "your-effect",
    name: "Your Effect",
    debug: true, // Enable debug mode
    // ...
  });
}
```

This provides:

- Performance metrics (FPS counter)
- Control value logging
- Error messages and warnings

### 3. Browser Developer Tools

Use your browser's developer tools to:

- Check the console for errors and debug messages
- Inspect network requests and resources
- Monitor performance with the Performance tab

## 🏗️ Building for Production

When your effect is ready for deployment to SignalRGB:

### Building a Single Effect

```bash
EFFECT=awesome-wave npm run build
```

This generates `dist/awesome-wave.html` - a standalone file ready for SignalRGB.

### Building All Effects

```bash
npm run build
```

### Debug Builds

For easier troubleshooting:

```bash
NO_MINIFY=true EFFECT=awesome-wave npm run build:debug
```

### Importing into SignalRGB

1. Open SignalRGB
2. Go to "Lighting Effects"
3. Click "Import from File" button
4. Select your HTML file from the `dist/` directory
5. Save and apply the effect

## 🎭 Tips & Best Practices

Here are some tips to help you create amazing effects:

### Shader Performance

- **Start Simple**: Begin with a minimal working effect and add complexity gradually
- **Avoid Expensive Functions**: Minimize use of sin, cos, pow, and log functions
- **Limit Iterations**: Unroll loops or keep iterations to a minimum
- **Use Approximations**: Replace complex calculations with simpler versions

### Control Design

- **Sensible Defaults**: Ensure your effect looks good with the default values
- **Logical Grouping**: Organize related controls together with descriptive names
- **Clear Labels**: Use descriptive labels and tooltips for controls
- **Reasonable Ranges**: Set appropriate min/max values for numeric controls

### Code Structure

- **Type Safety**: Leverage TypeScript interfaces for strong typing
- **Clean Functions**: Break complex logic into smaller, reusable functions
- **Descriptive Comments**: Document complex or non-obvious code
- **Consistent Naming**: Use clear, consistent naming conventions

## 🌟 Next Steps

Now that you understand the framework basics, here's how to continue your journey:

1. **Explore Example Effects**: Study the included effects to learn different techniques
2. **Experiment with Shaders**: Try modifying existing shaders before creating your own
3. **Check API Reference**: See the API documentation for detailed framework capabilities
4. **Join Community**: Share your effects and learn from others

For more advanced topics, check the [Advanced Guide](/docs/advanced.md) which covers:

- Advanced shader techniques
- Audio reactivity
- Optimization strategies
- Custom rendering techniques
