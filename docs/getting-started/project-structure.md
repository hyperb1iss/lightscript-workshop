# Project Structure

Here's how the codebase is organized. Understanding this will help you navigate and extend the framework.

## The Bird's Eye View

```
lightscript-workshop/
├── packages/               # The framework itself
│   ├── core/              # @lightscript/core — API you use
│   └── dev/               # @lightscript/dev — Dev tooling
│
├── src/
│   ├── effects/           # Your effects live here
│   └── shaders/           # Shared GLSL utilities
│
├── plugins/               # Custom Vite plugins
├── dist/                  # Built effects output
├── docs/                  # This documentation
└── tests/                 # Test files
```

## The Packages

### @lightscript/core

The standalone framework API. This is what you import in your effects.

```
packages/core/src/
├── controls/              # The decorator magic
│   ├── decorators.ts     # @Effect, @NumberControl, etc.
│   ├── definitions.ts    # Control type definitions
│   └── helpers.ts        # normalizeSpeed, comboboxValueToIndex
│
├── effects/               # Base classes for effects
│   ├── base-effect.ts    # Abstract foundation
│   ├── webgl-effect.ts   # GPU-powered rendering
│   └── canvas-effect.ts  # Canvas 2D rendering
│
├── utils/                 # Shared utilities
│   └── debug.ts          # Debug logging
│
└── index.ts               # Clean public exports
```

**Key exports you'll use:**
- Effect base classes: `WebGLEffect`, `CanvasEffect`
- Control decorators: `@Effect`, `@NumberControl`, `@BooleanControl`, `@ComboboxControl`
- Helpers: `normalizeSpeed`, `normalizePercentage`, `comboboxValueToIndex`, `boolToInt`
- Initialization: `initializeEffect`

### @lightscript/dev

Development-time tooling. Powers the preview UI and build scripts. Not included in production builds.

```
packages/dev/src/
├── engine/
│   └── preact-engine.ts  # Development preview engine
│
├── ui/                    # Preact UI components
│   ├── components/       # App, ControlPanel, etc.
│   └── styles/           # CSS
│
├── controls-registry.ts   # Runtime control UI generation
└── dev.ts                 # Dev server entry point
```

## Effect Anatomy

### WebGL Effect (Shader-based)

The minimal structure:

```
src/effects/my-effect/
├── fragment.glsl         # GLSL fragment shader
└── main.ts               # Effect class with decorators
```

The shader handles all rendering. TypeScript handles controls and uniform binding.

### Canvas Effect (2D Drawing)

```
src/effects/my-effect/
├── main.ts               # Effect class and rendering logic
├── types.ts              # TypeScript interfaces (optional)
└── helpers.ts            # Utility functions (optional)
```

No shader file — all rendering happens in TypeScript using the Canvas 2D API.

### Complex Effects

When your effect grows, split it up:

```
src/effects/glow-particles/
├── main.ts                    # Entry point, exports effect
├── glow-particles-effect.ts   # Main effect class
├── types.ts                   # Interface definitions
└── particle.ts                # Particle class/logic
```

## Shared Shaders

The `src/shaders/lib/` directory contains reusable GLSL functions:

| File | What It Does |
|------|--------------|
| `noise.glsl` | Perlin, simplex, and value noise functions |
| `color.glsl` | HSL/RGB conversion, palettes |
| `sdf.glsl` | Signed distance functions for shapes |

Import them in your shaders:

```glsl
#include "../shaders/lib/noise.glsl"
```

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Bundler configuration |
| `vitest.config.ts` | Test runner |
| `tsconfig.json` | TypeScript compiler options |
| `biome.jsonc` | Linter/formatter rules |
| `pnpm-workspace.yaml` | Monorepo workspace definition |

## Build Output

After `pnpm build:effects`:

```
dist/
├── black-hole.html        # Standalone effect
├── glow-particles.html
├── neon-pulse.html
└── ...
```

Each HTML file is completely self-contained:
- Embedded JavaScript (bundled + minified)
- SignalRGB metadata in HTML comments
- Control definitions for SignalRGB's UI

Drop these files into SignalRGB's effects folder and they just work.

## Import Paths

The framework uses path aliases for clean imports:

```typescript
// Framework imports
import { WebGLEffect, NumberControl } from '@lightscript/core'
import { generateControlUI } from '@lightscript/dev'

// Local imports
import fragmentShader from './fragment.glsl'
import { MyControls } from './types'
```

## Adding New Effects

1. Create a directory in `src/effects/`
2. Add your shader and/or TypeScript files
3. Export your effect as `default` from `main.ts`
4. Done — auto-discovered, no registration needed

## Next Steps

Now that you know where everything lives:

- [Guide](/guide/) — Deep dive into effect types and controls
- [Examples](/examples/) — Code patterns to learn from
