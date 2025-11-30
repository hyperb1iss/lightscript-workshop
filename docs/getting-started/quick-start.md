# Quick Start

Time to make something glow. In about 5 minutes, you'll have a working neon pulse effect running in your browser.

## Create the Effect Directory

Effects live in `src/effects/`. Each effect gets its own folder:

```bash
mkdir -p src/effects/neon-pulse
```

## Write the Shader

This is where the magic happens. Create `src/effects/neon-pulse/fragment.glsl`:

```glsl
// Standard uniforms — the framework provides these automatically
uniform float iTime;
uniform vec2 iResolution;

// Custom uniforms — these come from your controls
uniform float iSpeed;
uniform float iPulseWidth;
uniform int iColorMode;

// Color palette — pick your aesthetic
vec3 getColor(float t, int mode) {
  if (mode == 0) return vec3(1.0, 0.44, 0.81);  // Neon pink
  if (mode == 1) return vec3(0.0, 0.81, 0.996); // Cyan
  if (mode == 2) return vec3(0.5, 1.0, 0.63);   // Neon green
  return vec3(0.725, 0.404, 1.0);               // Purple
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Animated pulse wave
  float pulse = sin(uv.x * 10.0 - iTime * iSpeed) * 0.5 + 0.5;
  pulse =
    smoothstep(0.5 - iPulseWidth, 0.5, pulse) -
    smoothstep(0.5, 0.5 + iPulseWidth, pulse);

  // Vertical gradient for depth
  float gradient = 1.0 - abs(uv.y - 0.5) * 2.0;

  // Combine color, pulse, and gradient
  vec3 color = getColor(iTime, iColorMode) * pulse * gradient;

  // Subtle glow layer
  color += getColor(iTime, iColorMode) * 0.1 * gradient;

  fragColor = vec4(color, 1.0);
}

// Required wrapper for WebGL
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

## Write the Effect Class

Now create `src/effects/neon-pulse/main.ts` — this wires everything together:

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

// Type-safe control values
interface NeonPulseControls {
  speed: number
  pulseWidth: number
  colorMode: number
}

// SignalRGB reads these from window
declare global {
  interface Window {
    speed: number
    pulseWidth: number
    colorMode: string | number
  }
}

@Effect({
  name: 'Neon Pulse',
  description: 'Animated neon pulse wave',
  author: 'YourName',
})
export class NeonPulseEffect extends WebGLEffect<NeonPulseControls> {
  private readonly colorModes = ['Pink', 'Cyan', 'Green', 'Purple']

  @NumberControl({
    label: 'Speed',
    min: 1,
    max: 10,
    default: 5,
    tooltip: 'Animation speed',
  })
  speed!: number

  @NumberControl({
    label: 'Pulse Width',
    min: 5,
    max: 50,
    default: 20,
    tooltip: 'Width of the pulse wave',
  })
  pulseWidth!: number

  @ComboboxControl({
    label: 'Color',
    values: ['Pink', 'Cyan', 'Green', 'Purple'],
    default: 'Pink',
    tooltip: 'Pulse color',
  })
  colorMode!: string

  constructor() {
    super({
      id: 'neon-pulse',
      name: 'Neon Pulse',
      fragmentShader,
      debug: true,
    })
  }

  protected initializeControls(): void {
    window.speed = 5
    window.pulseWidth = 20
    window.colorMode = 'Pink'
  }

  protected getControlValues(): NeonPulseControls {
    return {
      speed: normalizeSpeed(window.speed ?? 5),
      pulseWidth: (window.pulseWidth ?? 20) / 100,
      colorMode: comboboxValueToIndex(
        window.colorMode ?? 'Pink',
        this.colorModes,
        0
      ),
    }
  }

  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iPulseWidth: { value: 0.2 },
      iColorMode: { value: 0 },
    }
  }

  protected updateUniforms(controls: NeonPulseControls): void {
    if (!this.material) return
    this.material.uniforms.iSpeed.value = controls.speed
    this.material.uniforms.iPulseWidth.value = controls.pulseWidth
    this.material.uniforms.iColorMode.value = controls.colorMode
  }
}

// Initialize and export
const effect = new NeonPulseEffect()
initializeEffect(() => effect.initialize())
export default effect
```

## Watch It Run

The effect is auto-discovered — no registration needed. Start the dev server:

```bash
pnpm dev
```

Open [localhost:4096](http://localhost:4096) and select **"Neon Pulse"** from the dropdown.

You should see:
- Animated neon pulse waves flowing across the canvas
- Working controls for speed, width, and color
- Real-time updates as you drag sliders

Try cranking up the speed. Try different colors. This is your creation.

## Build for Production

When you're happy with it:

```bash
pnpm build:effects
```

Your effect compiles to `dist/neon-pulse.html` — a single, self-contained file with everything embedded.

## Deploy to SignalRGB

1. Copy `dist/neon-pulse.html` to your SignalRGB effects folder:
   - **Windows**: `~/Documents/WhirlwindFX/Effects/`
   - **macOS**: `~/Documents/SignalRGB/Effects/`
2. Restart SignalRGB or refresh the effects list
3. Find **"Neon Pulse"** in Lighting Effects
4. Watch your keyboard become a portal

## You Did It

You've created a working effect from scratch. Now the real fun begins:

- [Guide](/guide/) — Deep dive into effect types, controls, and workflow
- [Examples](/examples/) — More patterns and techniques to steal
- [AI Development](/ai/) — Let AI help you build wilder stuff
