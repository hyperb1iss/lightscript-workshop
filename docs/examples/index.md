# Examples

Steal these patterns. That's what they're here for.

## WebGL Effect — The Full Pattern

Here's a complete WebGL effect with controls. Copy this as your starting point:

```typescript
import {
  Effect,
  NumberControl,
  ComboboxControl,
  WebGLEffect,
  initializeEffect,
  normalizeSpeed,
  comboboxValueToIndex,
} from '@lightscript/core'
import * as THREE from 'three'
import fragmentShader from './fragment.glsl'

interface MyControls {
  speed: number
  colorMode: number
}

@Effect({ name: 'My Effect', author: 'Me' })
export class MyEffect extends WebGLEffect<MyControls> {
  @NumberControl({ label: 'Speed', min: 1, max: 10, default: 5 })
  speed!: number

  @ComboboxControl({
    label: 'Color',
    values: ['Rainbow', 'Fire'],
    default: 'Rainbow',
  })
  colorMode!: string

  constructor() {
    super({ id: 'my-effect', name: 'My Effect', fragmentShader })
  }

  protected initializeControls() {
    window.speed = 5
    window.colorMode = 'Rainbow'
  }

  protected getControlValues(): MyControls {
    return {
      speed: normalizeSpeed(window.speed ?? 5),
      colorMode: comboboxValueToIndex(
        window.colorMode ?? 'Rainbow',
        ['Rainbow', 'Fire'],
        0
      ),
    }
  }

  protected createUniforms(): Record<string, THREE.IUniform> {
    return { iSpeed: { value: 1.0 }, iColorMode: { value: 0 } }
  }

  protected updateUniforms(c: MyControls) {
    if (!this.material) return
    this.material.uniforms.iSpeed.value = c.speed
    this.material.uniforms.iColorMode.value = c.colorMode
  }
}

initializeEffect(() => new MyEffect().initialize())
```

## GLSL Shader — The Template

Pair the above with this shader pattern:

```glsl
uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform int iColorMode;

vec3 getColor(float t, int mode) {
  if (mode == 0) return 0.5 + 0.5 * cos(t + vec3(0, 2, 4)); // Rainbow
  return vec3(1.0, 0.3 + 0.2 * sin(t), 0.1);                // Fire
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * iSpeed;
  vec3 col = getColor(t + uv.x * 3.0, iColorMode);
  fragColor = vec4(col, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

## Canvas Effect — Particle System

When you need to track individual objects with state:

```typescript
import {
  Effect,
  NumberControl,
  CanvasEffect,
  initializeEffect,
} from '@lightscript/core'

interface MyControls {
  speed: number
  particleCount: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

@Effect({ name: 'Particles', author: 'Me' })
export class ParticleEffect extends CanvasEffect<MyControls> {
  private particles: Particle[] = []

  @NumberControl({ label: 'Speed', min: 1, max: 10, default: 5 })
  speed!: number

  @NumberControl({ label: 'Particles', min: 10, max: 200, default: 50 })
  particleCount!: number

  constructor() {
    super({ id: 'particles', name: 'Particles' })
  }

  protected initializeControls() {
    window.speed = 5
    window.particleCount = 50
  }

  protected getControlValues(): MyControls {
    return {
      speed: window.speed ?? 5,
      particleCount: window.particleCount ?? 50,
    }
  }

  protected applyControls(c: MyControls) {
    // Spawn particles to match count
    while (this.particles.length < c.particleCount) {
      this.particles.push({
        x: Math.random() * (this.canvas?.width ?? 800),
        y: Math.random() * (this.canvas?.height ?? 600),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      })
    }
    this.particles.length = c.particleCount
  }

  protected draw(time: number, deltaTime: number) {
    if (!this.ctx || !this.canvas) return
    const { width, height } = this.canvas
    const c = this.getControlValues()

    // Fade effect for trails
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    this.ctx.fillRect(0, 0, width, height)

    // Draw and update particles
    this.ctx.fillStyle = '#ff71ce'
    for (const p of this.particles) {
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      this.ctx.fill()

      // Move particle
      p.x += p.vx * c.speed * deltaTime * 60
      p.y += p.vy * c.speed * deltaTime * 60

      // Bounce off walls
      if (p.x < 0 || p.x > width) p.vx *= -1
      if (p.y < 0 || p.y > height) p.vy *= -1
    }
  }
}

initializeEffect(() => new ParticleEffect().initialize())
```

## Effect Gallery

Study these effects in `src/effects/` for more advanced patterns:

| Effect | Type | What You'll Learn |
|--------|------|-------------------|
| `black-hole` | WebGL | Raymarching, gravitational lensing, accretion disk physics |
| `voronoi-flow` | WebGL | Voronoi cell generation, fluid-like movement |
| `glow-particles` | Canvas | Advanced particle system, glow rendering, trails |
| `cyber-descent` | WebGL | Matrix rain effect, scanlines, glitch aesthetics |
| `quantum-foam` | WebGL | Noise functions, wave equations, particle emergence |
| `kaleido-tunnel` | WebGL | Kaleidoscopic symmetry, infinite tunnel raymarching |

Each one demonstrates different techniques. Read the source, understand the patterns, make them your own.
