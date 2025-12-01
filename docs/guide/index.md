# Guide

Everything you need to know about building effects with LightScript Workshop.

## Two Ways to Render

LightScript gives you two rendering approaches. Pick the one that fits your vision:

### WebGL Effects — For the Math Wizards

GPU-accelerated GLSL shaders that run entirely on your graphics card. Perfect for:

- **Complex mathematical visualizations** — fractals, raymarching, fluid simulations
- **High-performance rendering** — 60fps even with expensive calculations
- **Shadertoy-style effects** — port existing shaders with minimal changes

```typescript
export class MyEffect extends WebGLEffect<MyControls> {
  // Define uniforms to pass data to your shader
  protected createUniforms() {
    return { iSpeed: { value: 1.0 }, iIntensity: { value: 0.5 } }
  }

  // Update uniforms when controls change
  protected updateUniforms(c: MyControls) {
    if (this.material) {
      this.material.uniforms.iSpeed.value = c.speed
      this.material.uniforms.iIntensity.value = c.intensity
    }
  }
}
```

### Canvas Effects — For the Object Thinkers

Traditional 2D drawing with JavaScript. Great for:

- **Particle systems** — hundreds of individually-tracked objects
- **Dynamic entities** — things that spawn, move, and die
- **Simpler effects** — when you don't need shader math

```typescript
export class MyEffect extends CanvasEffect<MyControls> {
  private particles: Particle[] = []

  protected draw(time: number, deltaTime: number) {
    // Clear with fade for trails
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw and update each particle
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fill()
      p.update(deltaTime)
    }
  }
}
```

## The Control System

Controls are defined with decorators. They automatically:
- Generate UI in the dev environment
- Sync with SignalRGB's control panel
- Provide type safety at compile time

```typescript
@Effect({ name: 'My Effect', author: 'Me' })
export class MyEffect extends WebGLEffect<MyControls> {

  // Numeric slider — drag to adjust
  @NumberControl({
    label: 'Speed',
    min: 1,
    max: 10,
    default: 5,
    tooltip: 'Animation speed multiplier'
  })
  speed!: number

  // Boolean toggle — on/off
  @BooleanControl({
    label: 'Enable Glow',
    default: true,
    tooltip: 'Add bloom effect to bright areas'
  })
  glowEnabled!: boolean

  // Dropdown — pick from options
  @ComboboxControl({
    label: 'Palette',
    values: ['Rainbow', 'Fire', 'Ocean', 'Neon'],
    default: 'Rainbow',
    tooltip: 'Color scheme'
  })
  palette!: string

  // Hue picker — 0-360 degrees
  @HueControl({
    label: 'Base Hue',
    default: 180
  })
  baseHue!: number
}
```

## Control Helpers

Raw control values often need transformation. LightScript provides helpers:

```typescript
import { normalizeSpeed, normalizePercentage, comboboxValueToIndex, boolToInt } from '@lightscript/core'

// Speed: 1-10 scale → animation multiplier
// 1 = 0.2x, 5 = 1.0x, 10 = 2.0x
const speed = normalizeSpeed(window.speed ?? 5)

// Percentage: 0-100 → 0.0-1.0
const intensity = normalizePercentage(window.intensity ?? 100)

// Combobox: string label → numeric index for shader
const paletteIndex = comboboxValueToIndex(
  window.palette ?? 'Rainbow',
  ['Rainbow', 'Fire', 'Ocean', 'Neon'],
  0  // default index if not found
)

// Boolean: true/false → 1/0 for shader uniform
const glowEnabled = boolToInt(window.glowEnabled ?? true)
```

## Audio Reactivity

Make your effects respond to music. LightScript provides seamless integration with SignalRGB's audio engine.

### Enable Audio in Your Effect

Just add `audioReactive: true` to your WebGL effect:

```typescript
constructor() {
  super({
    id: 'my-visualizer',
    name: 'My Visualizer',
    fragmentShader,
    audioReactive: true,  // ← This is all you need
  })
}
```

This automatically creates and updates audio uniforms every frame.

### Available Audio Uniforms

Once enabled, these uniforms are available in your GLSL shader:

| Uniform | Type | Description |
|---------|------|-------------|
| `iAudioLevel` | `float` | Overall volume (0-1) |
| `iAudioBass` | `float` | Bass intensity (0-1) |
| `iAudioMid` | `float` | Mid frequency intensity (0-1) |
| `iAudioTreble` | `float` | Treble intensity (0-1) |
| `iAudioSpectrum` | `sampler2D` | Full 200-band FFT as texture |

### Basic Audio Shader

```glsl
uniform float iAudioLevel;
uniform float iAudioBass;
uniform float iAudioMid;
uniform float iAudioTreble;

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Pulse the whole screen with bass
  float pulse = 1.0 + iAudioBass * 0.5;

  // Color based on frequency bands
  vec3 col = vec3(iAudioBass, iAudioMid, iAudioTreble);
  col *= pulse;

  fragColor = vec4(col, 1.0);
}
```

### Reading the Spectrum Texture

For per-frequency visualization, sample the spectrum texture:

```glsl
uniform sampler2D iAudioSpectrum;

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Sample frequency at this x position (0-200 bands mapped to 0-1)
  float freq = texture2D(iAudioSpectrum, vec2(uv.x, 0.5)).r;

  // Draw bar visualization
  float bar = step(uv.y, freq);
  fragColor = vec4(vec3(bar), 1.0);
}
```

### Dev Studio Audio Sources

In the dev environment, you can test audio reactivity using:

- **Microphone** — Pick up ambient audio
- **System Audio** — Capture your desktop audio (via screen share)

Click the audio panel in the dev UI to select your source.

## Development Workflow

### Start the Dev Server

```bash
pnpm dev
```

Opens at [localhost:4096](http://localhost:4096) with:
- **Effect selector** — switch between all discovered effects
- **Live controls** — adjust parameters in real-time
- **Hot reloading** — shader/TypeScript changes apply instantly
- **Persistence** — remembers your last selected effect

### Build for Production

```bash
pnpm build:effects              # Build all effects
EFFECT=my-effect pnpm build:effects  # Build specific effect
```

### Deploy to SignalRGB

Copy from `dist/` to your SignalRGB effects folder:
- **Windows**: `~/Documents/WhirlwindFX/Effects/`
- **macOS**: `~/Documents/SignalRGB/Effects/`

## Common Imports

```typescript
// Everything you need from one place
import {
  // Base classes
  WebGLEffect,
  CanvasEffect,

  // Decorators
  Effect,
  NumberControl,
  BooleanControl,
  ComboboxControl,
  HueControl,
  ColorControl,

  // Helpers
  normalizeSpeed,
  normalizePercentage,
  comboboxValueToIndex,
  boolToInt,

  // Audio (for manual control)
  getAudioData,
  smoothValue,

  // Initialization
  initializeEffect,
} from '@lightscript/core'
```

## Next Steps

- Check out the [Examples](/examples/) for complete, working patterns
- Browse the [API Reference](/reference/) for detailed documentation
- Try [AI Development](/ai/) to generate effects with prompts
