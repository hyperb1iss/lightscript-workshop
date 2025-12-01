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

## Audio-Reactive Effect

Full pattern for an audio visualizer:

```typescript
import {
  Effect,
  NumberControl,
  ComboboxControl,
  WebGLEffect,
  initializeEffect,
  normalizePercentage,
  comboboxValueToIndex,
} from '@lightscript/core'
import * as THREE from 'three'
import fragmentShader from './fragment.glsl'

interface VisualizerControls {
  sensitivity: number
  smoothing: number
  visualStyle: number
}

@Effect({ name: 'Audio Visualizer', author: 'Me' })
export class AudioVisualizer extends WebGLEffect<VisualizerControls> {
  @NumberControl({ label: 'Sensitivity', min: 10, max: 200, default: 100 })
  sensitivity!: number

  @NumberControl({ label: 'Smoothing', min: 0, max: 95, default: 50 })
  smoothing!: number

  @ComboboxControl({
    label: 'Style',
    values: ['Radial', 'Bars', 'Wave'],
    default: 'Radial',
  })
  visualStyle!: string

  constructor() {
    super({
      id: 'audio-visualizer',
      name: 'Audio Visualizer',
      fragmentShader,
      audioReactive: true,  // ← Enables audio uniforms
    })
  }

  protected initializeControls() {
    window.sensitivity = 100
    window.smoothing = 50
    window.visualStyle = 'Radial'
  }

  protected getControlValues(): VisualizerControls {
    return {
      sensitivity: normalizePercentage(window.sensitivity ?? 100) * 2.0,
      smoothing: normalizePercentage(window.smoothing ?? 50, 95),
      visualStyle: comboboxValueToIndex(
        window.visualStyle ?? 'Radial',
        ['Radial', 'Bars', 'Wave'],
        0
      ),
    }
  }

  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSensitivity: { value: 1.0 },
      iSmoothing: { value: 0.5 },
      iVisualStyle: { value: 0 },
    }
  }

  protected updateUniforms(c: VisualizerControls) {
    if (!this.material) return
    this.material.uniforms.iSensitivity.value = c.sensitivity
    this.material.uniforms.iSmoothing.value = c.smoothing
    this.material.uniforms.iVisualStyle.value = c.visualStyle
  }
}

initializeEffect(() => new AudioVisualizer().initialize())
```

### Audio Visualizer Shader

```glsl
uniform float iTime;
uniform vec2 iResolution;

// Audio uniforms (auto-provided when audioReactive: true)
uniform float iAudioLevel;
uniform float iAudioBass;
uniform float iAudioMid;
uniform float iAudioTreble;
uniform sampler2D iAudioSpectrum;

// Custom uniforms
uniform float iSensitivity;
uniform int iVisualStyle;

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 center = uv - 0.5;

  // Get frequency at this angle (radial) or x position (bars)
  float angle = atan(center.y, center.x) / 6.28318 + 0.5;
  float freq = texture2D(iAudioSpectrum, vec2(
    iVisualStyle == 0 ? angle : uv.x,
    0.5
  )).r * iSensitivity;

  // Distance from center
  float dist = length(center);

  // Radial visualization
  float ring = smoothstep(freq * 0.5, freq * 0.5 + 0.02, dist);
  ring *= smoothstep(0.0, 0.02, dist);

  // Color based on frequency bands
  vec3 col = vec3(0.0);
  col += vec3(1.0, 0.2, 0.5) * iAudioBass;
  col += vec3(0.2, 1.0, 0.5) * iAudioMid;
  col += vec3(0.5, 0.2, 1.0) * iAudioTreble;

  col *= (1.0 - ring);
  col += vec3(freq) * 0.5;

  fragColor = vec4(col, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

## Effect Gallery

Study these effects in `src/effects/` for more advanced patterns:

| Effect | Type | What You'll Learn |
|--------|------|-------------------|
| `audio-pulse` | WebGL | Audio reactivity, spectrum textures, multiple visual styles |
| `black-hole` | WebGL | Raymarching, gravitational lensing, accretion disk physics |
| `voronoi-flow` | WebGL | Voronoi cell generation, fluid-like movement |
| `glow-particles` | Canvas | Advanced particle system, glow rendering, trails |
| `cyber-descent` | WebGL | Matrix rain effect, scanlines, glitch aesthetics |
| `quantum-foam` | WebGL | Noise functions, wave equations, particle emergence |
| `kaleido-tunnel` | WebGL | Kaleidoscopic symmetry, infinite tunnel raymarching |

Each one demonstrates different techniques. Read the source, understand the patterns, make them your own.
