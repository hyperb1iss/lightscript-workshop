# LightScript Workshop - AI Agent Guide

This document provides context for AI agents (Claude, Copilot, Cursor, etc.) working with the LightScript Workshop codebase.

## Project Overview

LightScript Workshop is a TypeScript framework for creating RGB lighting effects for SignalRGB. It uses:

- **TypeScript** with decorators for type-safe effect development
- **Three.js** for WebGL rendering
- **GLSL shaders** for GPU-accelerated effects
- **Canvas 2D** for traditional drawing-based effects
- **Vite** for bundling and development server
- **pnpm** for package management (monorepo structure)

## Architecture

### Monorepo Structure

```
lightscript-workshop/
├── packages/
│   ├── core/           # @lightscript/core - Framework API
│   └── dev/            # @lightscript/dev - Development tooling
├── src/
│   ├── effects/        # User effects
│   └── shaders/        # Shared GLSL utilities
└── docs/               # VitePress documentation
```

### Package: @lightscript/core

The standalone framework API. Key exports:

```typescript
// Effect base classes
export { WebGLEffect } from "./effects/webgl-effect";
export { CanvasEffect } from "./effects/canvas-effect";
export { BaseEffect } from "./effects/base-effect";

// Control decorators
export {
  Effect, // Class decorator for metadata
  NumberControl, // Numeric slider
  BooleanControl, // Toggle/checkbox
  ComboboxControl, // Dropdown select
  HueControl, // Hue picker
  ColorControl, // Color picker
  TextFieldControl, // Text input
} from "./controls/decorators";

// Helpers
export {
  normalizeSpeed, // 1-10 → multiplier
  normalizePercentage, // 0-100 → 0-1
  comboboxValueToIndex, // string → int
  boolToInt, // bool → 0|1
} from "./controls/helpers";

// Initialization
export { initializeEffect } from "./index";
```

### Package: @lightscript/dev

Development tooling (not in production builds):

- `PreactDevEngine` - Development preview UI
- `generateControlUI` - Runtime control generation
- Build scripts for effect compilation

## Effect Patterns

### WebGL Effect Structure

```typescript
// src/effects/{effect-name}/main.ts
import {
  Effect,
  NumberControl,
  ComboboxControl,
  WebGLEffect,
  initializeEffect,
  normalizeSpeed,
  comboboxValueToIndex,
} from "@lightscript/core";
import * as THREE from "three";
import fragmentShader from "./fragment.glsl";

interface MyControls {
  speed: number;
  colorMode: number;
}

declare global {
  interface Window {
    speed: number;
    colorMode: string | number;
  }
}

@Effect({
  name: "Effect Name",
  description: "Effect description",
  author: "Author Name",
})
export class MyEffect extends WebGLEffect<MyControls> {
  private readonly colorModes = ["Rainbow", "Fire", "Ocean"];

  @NumberControl({
    label: "Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Animation speed",
  })
  speed!: number;

  @ComboboxControl({
    label: "Color Mode",
    values: ["Rainbow", "Fire", "Ocean"],
    default: "Rainbow",
  })
  colorMode!: string;

  constructor() {
    super({
      id: "effect-id",
      name: "Effect Name",
      fragmentShader,
      debug: true, // Enable for development
    });
  }

  protected initializeControls(): void {
    window.speed = 5;
    window.colorMode = "Rainbow";
  }

  protected getControlValues(): MyControls {
    return {
      speed: normalizeSpeed(window.speed ?? 5),
      colorMode: comboboxValueToIndex(
        window.colorMode ?? "Rainbow",
        this.colorModes,
        0,
      ),
    };
  }

  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iColorMode: { value: 0 },
    };
  }

  protected updateUniforms(controls: MyControls): void {
    if (!this.material) return;
    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iColorMode.value = controls.colorMode;
  }
}

const effect = new MyEffect();
initializeEffect(() => effect.initialize());
export default effect;
```

### GLSL Shader Structure

```glsl
// src/effects/{effect-name}/fragment.glsl

// Standard uniforms (always available)
uniform float iTime;
uniform vec2 iResolution;

// Custom uniforms from controls
uniform float iSpeed;
uniform int iColorMode;

// Your shader functions
vec3 getColor(float t, int mode) {
  // Color palette logic
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Shader logic here
  vec3 col = vec3(0.0);

  fragColor = vec4(col, 1.0);
}

// Required: entry point
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### Canvas Effect Structure

```typescript
// src/effects/{effect-name}/main.ts
import {
  Effect,
  NumberControl,
  CanvasEffect,
  initializeEffect,
} from "@lightscript/core";

interface MyControls {
  particleCount: number;
  speed: number;
}

@Effect({ name: "Particle Demo", author: "Author" })
export class ParticleDemo extends CanvasEffect<MyControls> {
  private particles: Array<{ x: number; y: number; vx: number; vy: number }> =
    [];

  @NumberControl({ label: "Particles", min: 10, max: 500, default: 100 })
  particleCount!: number;

  @NumberControl({ label: "Speed", min: 1, max: 10, default: 5 })
  speed!: number;

  constructor() {
    super({ id: "particle-demo", name: "Particle Demo" });
  }

  protected initializeControls(): void {
    window.particleCount = 100;
    window.speed = 5;
  }

  protected getControlValues(): MyControls {
    return {
      particleCount: window.particleCount ?? 100,
      speed: window.speed ?? 5,
    };
  }

  protected applyControls(controls: MyControls): void {
    // Adjust particle array size if needed
    while (this.particles.length < controls.particleCount) {
      this.particles.push(this.createParticle());
    }
    this.particles.length = controls.particleCount;
  }

  protected draw(time: number, deltaTime: number): void {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;
    const controls = this.getControlValues();

    // Clear
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    this.ctx.fillRect(0, 0, width, height);

    // Draw particles
    for (const p of this.particles) {
      this.ctx.fillStyle = "#ff71ce";
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Update position
      p.x += p.vx * controls.speed * deltaTime * 60;
      p.y += p.vy * controls.speed * deltaTime * 60;

      // Bounce
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }
  }

  private createParticle() {
    return {
      x: Math.random() * (this.canvas?.width ?? 800),
      y: Math.random() * (this.canvas?.height ?? 600),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    };
  }
}

initializeEffect(() => new ParticleDemo().initialize());
```

## Common Tasks

### Creating a New Effect

1. Create directory: `src/effects/{effect-name}/`
2. Create `fragment.glsl` (for WebGL) or just `main.ts` (for Canvas)
3. Create `main.ts` with effect class
4. Export effect instance as default
5. Effect is auto-discovered, no registration needed

### Control Normalization

```typescript
// Speed: 1-10 scale → animation multiplier
const speed = normalizeSpeed(window.speed ?? 5);
// 1 → 0.2, 5 → 1.0, 10 → 2.0

// Percentage: 0-100 → 0-1
const intensity = normalizePercentage(window.intensity ?? 100);
// 100 → 1.0, 50 → 0.5, 200 → 2.0

// Combobox: string → index
const modeIndex = comboboxValueToIndex(window.mode ?? "Default", options, 0);
// 'Default' → 0, 'Fire' → 1, etc.

// Boolean: true/false → 1/0 for shaders
const enabled = boolToInt(window.enabled ?? true);
// true → 1, false → 0
```

### Adding Controls

```typescript
// Number slider
@NumberControl({
  label: 'Intensity',
  min: 0,
  max: 200,
  default: 100,
  tooltip: 'Effect intensity (percentage)',
})
intensity!: number

// Boolean toggle
@BooleanControl({
  label: 'Enable Glow',
  default: true,
  tooltip: 'Add glow effect',
})
glowEnabled!: boolean

// Dropdown
@ComboboxControl({
  label: 'Palette',
  values: ['Rainbow', 'Neon', 'Fire', 'Ocean'],
  default: 'Rainbow',
  tooltip: 'Color palette',
})
palette!: string

// Hue picker (0-360)
@HueControl({
  label: 'Base Hue',
  min: 0,
  max: 360,
  default: 180,
})
baseHue!: number
```

## Commands

```bash
pnpm dev              # Start dev server (localhost:4096)
pnpm build:effects    # Build all effects to dist/
pnpm typecheck        # TypeScript type checking
pnpm test             # Run tests
pnpm lint             # Lint with Biome
```

## File Locations

| Purpose       | Location                           |
| ------------- | ---------------------------------- |
| Effect code   | `src/effects/{name}/main.ts`       |
| Effect shader | `src/effects/{name}/fragment.glsl` |
| Core API      | `packages/core/src/`               |
| Dev tooling   | `packages/dev/src/`                |
| Tests         | `tests/`                           |
| Documentation | `docs/`                            |
| Built effects | `dist/`                            |

## SignalRGB Integration

Effects communicate with SignalRGB through the `window` object:

```typescript
// SignalRGB calls window.update() when controls change
window.update?: (force?: boolean) => void

// Show notifications in SignalRGB
window.showNotification?: (message: string, isError?: boolean) => void

// Control values are stored as window properties
window.speed = 5
window.colorMode = 'Rainbow'
```

## Style Guidelines

- Use TypeScript strict mode
- Follow existing patterns in `src/effects/black-hole/` or `src/effects/glow-particles/`
- Include type definitions for control interfaces
- Use `declare global` for window property declarations
- Add tooltips to controls for user guidance
- Use `normalizeSpeed`, `normalizePercentage`, `comboboxValueToIndex` helpers

## Testing

```bash
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm coverage         # Coverage report
```

Test files are in `tests/` and use Vitest.

## Build Output

Built effects are single HTML files in `dist/`:

- Self-contained (JavaScript embedded)
- SignalRGB metadata in HTML comments
- Control definitions for SignalRGB UI
- Ready to copy to SignalRGB effects folder
