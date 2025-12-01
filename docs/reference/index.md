# API Reference

Everything you need to know about the LightScript API. Keep this handy.

## Effect Base Classes

### WebGLEffect

The foundation for GPU-powered shader effects.

```typescript
class WebGLEffect<T extends object> extends BaseEffect<T> {
  protected material: THREE.ShaderMaterial | null

  // Override these in your effect
  protected createUniforms(): Record<string, THREE.IUniform>
  protected updateUniforms(controls: T): void
}
```

**Usage:**

```typescript
export class MyShader extends WebGLEffect<MyControls> {
  constructor() {
    super({ id: 'my-shader', name: 'My Shader', fragmentShader })
  }

  protected createUniforms() {
    return { iSpeed: { value: 1.0 } }
  }

  protected updateUniforms(c: MyControls) {
    if (this.material) this.material.uniforms.iSpeed.value = c.speed
  }
}
```

### CanvasEffect

The foundation for Canvas 2D effects.

```typescript
class CanvasEffect<T extends object> extends BaseEffect<T> {
  protected ctx: CanvasRenderingContext2D | null
  protected canvas: HTMLCanvasElement | null

  // Override these in your effect
  protected draw(time: number, deltaTime: number): void
  protected applyControls(controls: T): void
}
```

**Usage:**

```typescript
export class MyParticles extends CanvasEffect<MyControls> {
  protected draw(time: number, deltaTime: number) {
    this.ctx.fillStyle = '#ff00ff'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
```

### BaseEffect

Abstract base class for all effects. You'll rarely extend this directly.

```typescript
abstract class BaseEffect<T extends object> {
  readonly id: string
  readonly name: string

  initialize(): Promise<void>
  stop(): void
  update(force?: boolean): void

  // You must implement these
  protected abstract initializeControls(): void
  protected abstract getControlValues(): T
}
```

## Control Decorators

### @Effect

Class decorator for effect metadata. Required on every effect class.

```typescript
@Effect({
  name: string,           // Display name in UI
  description?: string,   // Short description
  author?: string         // Your name
})
```

### @NumberControl

Numeric slider for continuous values.

```typescript
@NumberControl({
  label: string,          // Display label
  min?: number,           // Minimum value (default: 0)
  max?: number,           // Maximum value (default: 100)
  default?: number,       // Default value (default: 50)
  step?: number,          // Step increment (default: 1)
  tooltip?: string        // Help text
})
```

### @BooleanControl

Toggle switch for on/off states.

```typescript
@BooleanControl({
  label: string,
  default?: boolean,      // Default: false
  tooltip?: string
})
```

### @ComboboxControl

Dropdown for selecting from options.

```typescript
@ComboboxControl({
  label: string,
  values: string[],       // Available options
  default?: string,       // Default selection
  tooltip?: string
})
```

### @HueControl

Color wheel for hue selection (0-360).

```typescript
@HueControl({
  label: string,
  default?: number        // Default: 0
})
```

### @ColorControl

Full color picker with hex/RGB output.

### @TextFieldControl

Free-form text input.

## Control Helpers

These transform raw control values into shader-friendly formats.

### normalizeSpeed

Converts 1-10 speed scale to animation multiplier.

```typescript
normalizeSpeed(value: number): number
// 1 → 0.2, 5 → 1.0, 10 → 2.0
```

### normalizePercentage

Converts 0-100 percentage to 0-1 factor.

```typescript
normalizePercentage(value: number, base?: number, min?: number): number
```

### comboboxValueToIndex

Converts string option to numeric index for shaders.

```typescript
comboboxValueToIndex(
  value: string | number,
  options: string[],
  defaultIndex?: number
): number
```

### boolToInt

Converts boolean to 0 or 1 for shader uniforms.

```typescript
boolToInt(value: boolean | number): number
// true → 1, false → 0
```

## Initialization

### initializeEffect

Entry point for all effects. Call this at the end of your `main.ts`.

```typescript
initializeEffect(initFunction: () => void, options?: InitOptions): void
```

**Standard pattern:**

```typescript
const effect = new MyEffect()
initializeEffect(() => effect.initialize())
export default effect
```

## Debug Utilities

### createDebugLogger

Create a scoped logger for development debugging.

```typescript
const debug = createDebugLogger('MyEffect')

debug('info', 'Starting up')
debug('warn', 'Something weird')
debug('error', 'This is bad')
```

## Standard Uniforms

These are automatically provided to all WebGL effects:

| Uniform | Type | Description |
|---------|------|-------------|
| `iTime` | `float` | Time in seconds since effect started |
| `iResolution` | `vec2` | Canvas dimensions in pixels |
| `iFrame` | `int` | Current frame number |

## Audio Uniforms

When `audioReactive: true` is set, these additional uniforms are available:

| Uniform | Type | Description |
|---------|------|-------------|
| `iAudioLevel` | `float` | Overall volume (0-1, normalized from dB) |
| `iAudioLevelRaw` | `float` | Raw level in decibels (-100 to 0) |
| `iAudioBass` | `float` | Bass frequency band (0-1) |
| `iAudioMid` | `float` | Mid frequency band (0-1) |
| `iAudioTreble` | `float` | Treble frequency band (0-1) |
| `iAudioDensity` | `float` | Tone density (0=pure tone, 1=noise) |
| `iAudioWidth` | `float` | Stereo width (0-1) |
| `iAudioSpectrum` | `sampler2D` | 200-band FFT as 256x1 texture |

## Audio API

Functions for manual audio control (most effects just use `audioReactive: true`).

### getAudioData

Fetch normalized audio data from SignalRGB.

```typescript
import { getAudioData } from '@lightscript/core'

const audio = getAudioData()
console.log(audio.level)      // 0-1 normalized level
console.log(audio.bass)       // 0-1 bass intensity
console.log(audio.mid)        // 0-1 mid intensity
console.log(audio.treble)     // 0-1 treble intensity
console.log(audio.frequency)  // Float32Array[200] - full spectrum
```

**Returns:** `AudioData`

```typescript
interface AudioData {
  level: number         // Normalized level (0-1)
  levelRaw: number      // Raw level in dB (-100 to 0)
  density: number       // Tone density (0-1)
  width: number         // Stereo width (0-1)
  frequencyRaw: Int8Array   // Raw FFT (200 elements)
  frequency: Float32Array   // Normalized FFT (200 elements, 0-1)
  bass: number          // Bass level (0-1)
  mid: number           // Mid level (0-1)
  treble: number        // Treble level (0-1)
}
```

### smoothValue

Smooth audio values over time using exponential moving average.

```typescript
import { smoothValue } from '@lightscript/core'

let smoothedBass = 0
// In animation loop:
smoothedBass = smoothValue(audio.bass, smoothedBass, 0.8)
```

**Parameters:**
- `currentValue` — Current raw value
- `previousValue` — Previous smoothed value
- `smoothing` — Factor 0-1 (higher = smoother)

### createAudioUniforms / updateAudioUniforms

Manual uniform creation (for advanced use cases).

```typescript
import { createAudioUniforms, updateAudioUniforms, getAudioData } from '@lightscript/core'

// In createUniforms():
return {
  ...createAudioUniforms(),
  iMyCustomUniform: { value: 1.0 },
}

// In render loop:
const audio = getAudioData()
updateAudioUniforms(this.material.uniforms, audio)
