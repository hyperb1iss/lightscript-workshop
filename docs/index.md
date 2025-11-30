---
layout: home

hero:
  name: "✨ LightScript Workshop"
  text: Mind-bending RGB effects
  tagline: For the chronically creative
  actions:
    - theme: brand
      text: 🚀 Get Started
      link: /getting-started/
    - theme: alt
      text: 💡 Examples
      link: /examples/
    - theme: alt
      text: GitHub
      link: https://github.com/hyperb1iss/lightscript-workshop

features:
  - icon: 🎮
    title: WebGL + Canvas 2D
    details: GPU-accelerated GLSL shaders for complex visuals, or Canvas 2D for particle systems. Pick your weapon.
  - icon: 🎛️
    title: Decorator Controls
    details: "@NumberControl, @BooleanControl, @ComboboxControl — type-safe UI elements through simple decorators."
  - icon: 🔥
    title: Hot Reloading
    details: Edit your shader, see it instantly. No refresh, no waiting. Just pure creative flow.
  - icon: 🤖
    title: AI-Native Design
    details: Structured patterns that AI understands. Generate complete effects with natural language prompts.
  - icon: 📦
    title: Monorepo Architecture
    details: Clean separation — @lightscript/core for the API, @lightscript/dev for tooling. Use what you need.
  - icon: 🚀
    title: One-Click Deploy
    details: Build optimized single-file HTML effects ready to drop into SignalRGB.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #e135ff 0%, #80ffea 100%);
}

.dark {
  --vp-home-hero-image-background-image: linear-gradient(135deg, rgba(225, 53, 255, 0.2) 0%, rgba(128, 255, 234, 0.2) 100%);
  --vp-home-hero-image-filter: blur(56px);
}
</style>

## 🎨 What Can You Build?

LightScript Workshop ships with effects that push the boundaries:

| Effect | What It Does |
|--------|--------------|
| 🕳️ **Black Hole** | Gravitational lensing with accretion disk and Hawking radiation |
| 💎 **Voronoi Flow** | Cellular patterns morphing with fluid dynamics |
| 🌧️ **Cyber Descent** | Cyberpunk matrix rainfall with scanline artifacts |
| ⚛️ **Quantum Foam** | Planck-scale virtual particles popping into existence |
| 🎯 **ADHD Hyperfocus** | Tunnel vision with dopamine-seeking sparkles |

And you can create your own in minutes.

## ⚡ Quick Example

```typescript
import { Effect, NumberControl, WebGLEffect, initializeEffect } from '@lightscript/core'
import fragmentShader from './fragment.glsl'

@Effect({ name: 'Neon Dreams', author: 'You' })
export class NeonDreams extends WebGLEffect<{ speed: number }> {
  @NumberControl({ label: 'Speed', min: 1, max: 10, default: 5 })
  speed!: number

  constructor() {
    super({ id: 'neon-dreams', name: 'Neon Dreams', fragmentShader })
  }

  protected initializeControls() { window.speed = 5 }
  protected getControlValues() { return { speed: window.speed ?? 5 } }
  protected createUniforms() { return { iSpeed: { value: 1.0 } } }
  protected updateUniforms(c) {
    if (this.material) this.material.uniforms.iSpeed.value = c.speed
  }
}

initializeEffect(() => new NeonDreams().initialize())
```

That's it. Drop this in `src/effects/neon-dreams/main.ts` with a GLSL shader and it's auto-discovered.

## 🤖 AI-Powered Development

LightScript is designed for AI collaboration. Try this prompt:

```
Create a WebGL effect called "aurora-waves" that simulates northern lights.
Add controls for speed (1-10), intensity (0-200), and a color palette dropdown.
Reference src/effects/black-hole/main.ts for the pattern.
```

Works with Claude, Cursor, Copilot — any AI that can read code.

## 🚀 Ready?

<div class="tip custom-block" style="padding-top: 8px;">

Jump to [Getting Started](/getting-started/) and have your first effect running in under 5 minutes.

</div>
