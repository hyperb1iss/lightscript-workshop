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
- **Declarative Controls** - Define UI elements with simple HTML

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
├── common/          # Framework core
│   ├── controls.ts  # Control handling
│   ├── debug.ts     # Debug utilities
│   ├── effect.ts    # BaseEffect class
│   ├── engine.ts    # Development engine
│   ├── parser.ts    # HTML parser
│   └── webgl.ts     # WebGL utilities
│
├── effects/         # Effect implementations
│   ├── puff-stuff/  # Example effect
│   │   ├── fragment.glsl
│   │   ├── main.ts
│   │   └── template.html
│   │
│   └── simple-wave/ # Example effect
│       ├── fragment.glsl
│       ├── main.ts
│       └── template.html
│
└── index.ts         # Effect registry
```

Each effect consists of three primary files:

- **fragment.glsl** - The WebGL shader that creates your visual effect
- **main.ts** - TypeScript implementation using the BaseEffect class
- **template.html** - HTML template with control definitions and metadata

## 💫 Core Concepts

Before creating your first effect, let's understand the core concepts of the framework.

### The Effect Lifecycle

1. **Initialization**: The effect loads and sets up WebGL context
2. **Control Setup**: Default control values are established
3. **Animation Loop**: Continuous rendering based on time and inputs
4. **Control Updates**: React to user changes to controls
5. **Shutdown**: Clean up resources when the effect is closed

### BaseEffect Class

The `BaseEffect` class is the foundation for all effects. It handles:

- WebGL initialization
- Animation loop management
- Control synchronization
- Shader uniform updates

When you create a new effect, you'll extend this class and implement four key methods:

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

### Control System

Controls allow users to customize your effect. They're defined in the HTML template as meta tags, automatically parsed by the framework, and synchronized with your effect code.

```html
<meta
  property="speed"
  label="Animation Speed"
  type="number"
  min="1"
  max="10"
  default="5"
  tooltip="Controls how fast the animation runs"
/>
```

The framework supports these control types:

- **number** - Sliders with numeric values
- **boolean** - Checkbox toggles
- **combobox** - Dropdown selections

### WebGL & Shaders

The framework uses Three.js for WebGL rendering, which abstracts away much of the complexity. Your effect's visual appearance is defined in a GLSL fragment shader that runs on the GPU.

Standard uniforms provided to all shaders:

- `iTime` - Time in seconds
- `iResolution` - Canvas dimensions
- `iMouse` - Mouse position (when available)

You'll define additional custom uniforms for your effect's specific needs.

## 🎨 Creating Your First Effect

Let's create a simple wave effect to demonstrate the framework. We'll build it step by step.

### 1. Create the Directory Structure

```bash
mkdir -p src/effects/awesome-wave
```

### 2. Create the HTML Template

Create `template.html` with effect metadata and controls:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Awesome Wave</title>
    <meta name="description" content="A colorful wave effect" />
    <meta publisher="YourName" />

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
      property="colorMode"
      label="Color Scheme"
      type="combobox"
      values="Rainbow,Ocean,Fire,Neon"
      default="Rainbow"
      tooltip="Select the color palette"
    />
    <meta
      property="waveHeight"
      label="Wave Height"
      type="number"
      min="10"
      max="100"
      default="50"
      tooltip="Controls the height of the wave"
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

### 3. Create the Fragment Shader

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

### 4. Create the TypeScript Implementation

Create `main.ts` to connect your shader to the framework:

```typescript
import { BaseEffect } from "../../common/effect";
import { normalizeSpeed, getControlValue } from "../../common/controls";
import { initializeEffect } from "../../common";
import * as THREE from "three";

// Import shader
import fragmentShader from "./fragment.glsl";

// Define control interface
export interface AwesomeWaveControls {
  speed: number;
  colorMode: string | number;
  waveHeight: number;
}

// Effect implementation
export class AwesomeWave extends BaseEffect<AwesomeWaveControls> {
  // Color mode options for conversion
  private readonly colorModes = ["Rainbow", "Ocean", "Fire", "Neon"];

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
      colorMode,
      waveHeight: getControlValue<number>("waveHeight", 50),
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
const effect = new AwesomeWave();
initializeEffect(() => effect.initialize());

export default effect;
```

### 5. Register Your Effect

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
    template: "./effects/awesome-wave/template.html",
  },
];
```

### 6. Test Your Effect

Run the development server and navigate to your effect:

```bash
npm run dev
# Then open: http://localhost:3000?effect=awesome-wave
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
- **Logical Grouping**: Organize related controls together
- **Clear Naming**: Use descriptive labels for controls
- **Helpful Tooltips**: Provide guidance in tooltip attributes

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
