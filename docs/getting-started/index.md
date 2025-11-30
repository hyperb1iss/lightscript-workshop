# Welcome to LightScript Workshop

You're about to transform your RGB setup from "nice lights" into "wait, is my keyboard a portal to another dimension?"

LightScript Workshop is a TypeScript framework for creating mind-bending RGB lighting effects for [SignalRGB](https://signalrgb.com/). It turns effect development from frustrating JavaScript guesswork into a structured, type-safe creative playground.

## What You'll Build

Effects are visual animations that run on your RGB devices. With LightScript, you can create:

| Type | What It Does |
|------|--------------|
| **Particle storms** | Hundreds of glowing particles with physics and trails |
| **Shader magic** | GPU-accelerated GLSL wizardry — fractals, raymarching, fluid sims |
| **Procedural patterns** | Voronoi cells, noise fields, infinite tunnels |
| **Reactive visuals** | Animations that respond to user-controlled parameters |

## Two Flavors of Awesome

### WebGL Effects — For the Math Wizards

GPU-accelerated fragment shaders that run entirely on your graphics card. Write GLSL, get 60fps magic.

```typescript
export class CosmicPortal extends WebGLEffect<MyControls> {
  // Your GLSL shader does the heavy lifting
  constructor() {
    super({ fragmentShader, id: 'cosmic-portal', name: 'Cosmic Portal' })
  }
}
```

**Best for:** Complex math visualizations, raymarching, Shadertoy ports, anything that needs raw GPU power.

### Canvas Effects — For the Object Thinkers

Traditional 2D drawing with JavaScript. Track hundreds of individual objects with state.

```typescript
export class StarField extends CanvasEffect<MyControls> {
  protected draw(time: number, deltaTime: number): void {
    // Direct canvas drawing — you control every pixel
  }
}
```

**Best for:** Particle systems, dynamic entity counts, when shader math isn't your vibe.

## The Control System

Expose parameters to users through decorators. No boilerplate, just vibes:

```typescript
@NumberControl({ label: 'Speed', min: 0, max: 10, default: 5 })
speed!: number

@BooleanControl({ label: 'Enable Glow', default: true })
glowEnabled!: boolean

@ComboboxControl({ label: 'Mode', values: ['Chill', 'Chaos', 'Transcend'], default: 'Chill' })
mode!: string
```

These decorators automatically:
- Generate UI controls in the dev preview
- Handle type conversion and validation
- Sync to your shader uniforms
- Export metadata for SignalRGB

## The Workflow

1. **Write your effect** — TypeScript + GLSL (or just TypeScript for Canvas)
2. **Preview in browser** — Hot reloading, live controls, instant feedback
3. **Build for production** — Single HTML file, optimized and ready
4. **Deploy to SignalRGB** — Copy to effects folder, done

## Ready to Create?

- [Installation](/getting-started/installation) — Get your environment set up
- [Quick Start](/getting-started/quick-start) — Build your first effect in 5 minutes
- [Project Structure](/getting-started/project-structure) — Navigate the codebase
