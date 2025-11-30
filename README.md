<div align="center">

# 💜⚡ 𝕃𝕚𝕘𝕙𝕥𝕊𝕔𝕣𝕚𝕡𝕥 𝕎𝕠𝕣𝕜𝕤𝕙𝕠𝕡 ⚡💜

### _Mind-bending RGB effects for the chronically creative_

[![TypeScript](https://img.shields.io/badge/TypeScript-e135ff?style=for-the-badge&logo=typescript&logoColor=121218)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-80ffea?style=for-the-badge&logo=three.js&logoColor=121218)](https://threejs.org/)
[![WebGL](https://img.shields.io/badge/WebGL-ff6ac1?style=for-the-badge&logo=webgl&logoColor=121218)](https://www.khronos.org/webgl/)
[![Vite](https://img.shields.io/badge/Vite-bd93f9?style=for-the-badge&logo=vite&logoColor=121218)](https://vitejs.dev/)
[![SignalRGB](https://img.shields.io/badge/SignalRGB-50fa7b?style=for-the-badge&logoColor=121218)](https://signalrgb.com/)

[![License](https://img.shields.io/github/license/hyperb1iss/lightscript-workshop?style=flat-square&color=e135ff)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/hyperb1iss/lightscript-workshop?style=flat-square&color=80ffea)](https://github.com/hyperb1iss/lightscript-workshop/stargazers)

[💎 Documentation](https://hyperb1iss.github.io/lightscript-workshop/) · [🌌 Effect Gallery](#-effect-gallery) · [💫 Quick Start](#-quick-start)

</div>

---

## 💫 Quick Start

```bash
git clone https://github.com/hyperb1iss/lightscript-workshop.git
cd lightscript-workshop
pnpm install
pnpm dev
```

Open [localhost:4096](http://localhost:4096) and watch your keyboard become a canvas. The dev UI remembers your last effect, so you can pick up right where you left off.

## 💎 Features

| Feature | Description |
|---------|-------------|
| **WebGL + Canvas 2D** | GPU-accelerated shaders _or_ traditional drawing — your choice |
| **Decorator Controls** | Type-safe UI with `@NumberControl`, `@BooleanControl`, `@ComboboxControl` |
| **Hot Reloading** | Change shader code, see it instantly — no refresh needed |
| **AI-Native** | Designed for Claude, Cursor, and Copilot to generate effects |
| **Monorepo** | Clean separation: `@lightscript/core` for the API, `@lightscript/dev` for tooling |
| **GLSL Tooling** | Lint, format, and share shader code with built-in utilities |

## 🌌 Effect Gallery

### ⚛️ Physics & Mathematics
| Effect | Vibe |
|--------|------|
| **Black Hole** | Gravitational lensing with accretion disk and Hawking radiation |
| **Voronoi Flow** | Cellular patterns morphing with fluid dynamics |
| **Quantum Foam** | Planck-scale virtual particles popping in and out of existence |

### 💾 Digital & Glitch
| Effect | Vibe |
|--------|------|
| **Cyber Descent** | Cyberpunk matrix rainfall with scanline artifacts |
| **Reality.exe Error** | Windows BSOD and error dialogs as RGB chaos |
| **Kaleido Tunnel** | Raymarched kaleidoscopic infinity tunnel |

### 🌀 Mind-Bending
| Effect | Vibe |
|--------|------|
| **Glow Particles** | Vibrant particle swarms with luminous trails |
| **ADHD Hyperfocus** | Tunnel vision with dopamine-seeking sparkles |
| **Temporal Hallucination** | Time-warping patterns that predict the future |

## 🔮 Creating Effects

Effects are TypeScript classes with GLSL shaders. Here's the pattern:

```typescript
import {
  Effect, NumberControl, WebGLEffect, initializeEffect, normalizeSpeed
} from '@lightscript/core'
import fragmentShader from './fragment.glsl'

interface MyControls { speed: number }

@Effect({ name: 'Neon Dreams', author: 'You' })
export class NeonDreams extends WebGLEffect<MyControls> {
  @NumberControl({ label: 'Speed', min: 1, max: 10, default: 5 })
  speed!: number

  constructor() {
    super({ id: 'neon-dreams', name: 'Neon Dreams', fragmentShader })
  }

  protected initializeControls() { window.speed = 5 }
  protected getControlValues() { return { speed: normalizeSpeed(window.speed ?? 5) } }
  protected createUniforms() { return { iSpeed: { value: 1.0 } } }
  protected updateUniforms(c: MyControls) {
    if (this.material) this.material.uniforms.iSpeed.value = c.speed
  }
}

initializeEffect(() => new NeonDreams().initialize())
```

And the shader (`fragment.glsl`):

```glsl
uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime * iSpeed;
    vec3 col = 0.5 + 0.5 * cos(t + uv.xyx + vec3(0, 2, 4));
    fragColor = vec4(col, 1.0);
}

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
```

Drop these in `src/effects/neon-dreams/` and it's auto-discovered. No registration needed.

## 🗂️ Project Structure

```
lightscript-workshop/
├── packages/
│   ├── core/              # @lightscript/core — The framework API
│   └── dev/               # @lightscript/dev — Dev server & build tools
├── src/
│   ├── effects/           # Your effects live here
│   └── shaders/           # Shared GLSL utilities (noise, colors, SDFs)
├── docs/                  # VitePress documentation
└── dist/                  # Built effects ready for SignalRGB
```

## ⌨️ Commands

```bash
pnpm dev              # Start dev server with hot reload
pnpm build:effects    # Build all effects to dist/
pnpm docs             # Preview documentation locally
pnpm typecheck        # Check TypeScript types
pnpm test             # Run tests
pnpm lint             # Lint code
```

## 🪐 Deploy to SignalRGB

```bash
# Build your effect
EFFECT=black-hole pnpm build:effects

# Copy to SignalRGB effects folder
# Windows: ~/Documents/WhirlwindFX/Effects/
# macOS:   ~/Documents/SignalRGB/Effects/
```

Restart SignalRGB, find your effect in "Lighting Effects", and bask in the glow.

## 🧬 AI-Powered Development

LightScript Workshop is built for AI collaboration. The consistent patterns and typed interfaces make it trivial for AI to generate complete, working effects.

**Try this prompt:**
```
Create a WebGL effect called "aurora-waves" that simulates northern lights.
Add controls for speed (1-10), intensity (0-200), and a color palette dropdown.
Reference src/effects/black-hole/main.ts for the pattern.
```

See [CLAUDE.md](CLAUDE.md) for complete AI agent documentation.

## 🌙 Documentation

Full docs at [hyperb1iss.github.io/lightscript-workshop](https://hyperb1iss.github.io/lightscript-workshop/)

- [Getting Started](https://hyperb1iss.github.io/lightscript-workshop/getting-started/) — Installation and first effect
- [Guide](https://hyperb1iss.github.io/lightscript-workshop/guide/) — Core concepts and patterns
- [Reference](https://hyperb1iss.github.io/lightscript-workshop/reference/) — Complete API documentation
- [Examples](https://hyperb1iss.github.io/lightscript-workshop/examples/) — Code patterns and snippets
- [AI Development](https://hyperb1iss.github.io/lightscript-workshop/ai/) — Working with AI assistants

## 💜 Contributing

Got a wild effect idea? Performance optimization? Bug fix? We want it all.

```bash
pnpm install && pnpm dev   # Get running
# Make something awesome
pnpm test && pnpm lint     # Make sure it's solid
```

## 📜 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">

Created by [Stefanie Jane 🌠](https://github.com/hyperb1iss)

If your RGB has transcended, [buy me a Monster Ultra Violet](https://ko-fi.com/hyperb1iss)! ⚡️

</div>
