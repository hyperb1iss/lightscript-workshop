# 🧩 LightScript Workshop API Reference

<div align="center">

![API Reference](https://img.shields.io/badge/API-Reference-01CDFE?style=for-the-badge)

_The complete spellbook for RGB enchanters_

</div>

This document provides detailed information about all the APIs and utilities available in the LightScript Workshop framework. Use it as a reference when developing your own lighting effects.

## 📑 Table of Contents

- [Core Framework Structure](#-core-framework-structure)
- [BaseEffect Class](#-baseeffect-class)
- [Decorator-Based Controls](#-decorator-based-controls)
- [WebGL Utilities](#-webgl-utilities)
- [Debug Tools](#-debug-tools)
- [Types & Definitions](#-types--definitions)

## 🧪 Core Framework Structure

The LightScript Workshop framework is organized into logical modules:

- `core/` - Core framework components for effect development
  - `effects/` - Base classes for different rendering approaches
  - `controls/` - Decorator-based control system
  - `utils/` - Shared utilities and helper functions
- `dev/` - Development environment (not included in production builds)

## 🧠 BaseEffect Class

The `BaseEffect` class is the foundation of all lighting effects in the framework. It provides a structured approach to initializing rendering contexts, managing controls, and handling animation. This is an abstract base class that should be extended by renderer-specific classes like `WebGLEffect` or `CanvasEffect`.

### Core Properties

| Property       | Type                | Description                      |
| -------------- | ------------------- | -------------------------------- |
| `id`           | `string`            | Unique identifier for the effect |
| `name`         | `string`            | Display name                     |
| `debug`        | `Function`          | Debug logger instance            |
| `animationId`  | `number \| null`    | Current animation frame ID       |
| `canvas`       | `HTMLCanvasElement` | Canvas element for rendering     |
| `canvasWidth`  | `number`            | Canvas width                     |
| `canvasHeight` | `number`            | Canvas height                    |

### Constructor

```typescript
constructor(config: EffectConfig)
```

Creates a new effect instance with the specified configuration.

**Parameters:**

- `config`: Configuration object with the following properties:
  - `id`: Unique effect identifier
  - `name`: Display name
  - `debug`: (Optional) Enable debug logging
  - `canvasWidth`: (Optional) Canvas width, defaults to 320
  - `canvasHeight`: (Optional) Canvas height, defaults to 200

### Public Methods

#### `initialize()`

```typescript
public async initialize(): Promise<void>
```

Initializes the effect, setting up rendering context, and starting the animation loop.

#### `update()`

```typescript
public update(force: boolean = false): void
```

Updates the effect parameters from controls. Automatically called when control values change.

**Parameters:**

- `force`: (Optional) If true, forces an update regardless of value changes

#### `stop()`

```typescript
public stop(): void
```

Stops the animation loop and cleans up resources.

### Methods to Implement

When extending `BaseEffect`, you must implement these methods:

#### `initializeRenderer()`

```typescript
protected abstract initializeRenderer(): Promise<void>
```

Initialize the renderer-specific context and resources.

#### `render()`

```typescript
protected abstract render(time: number): void
```

Render a frame using the specific rendering technique.

**Parameters:**

- `time`: Current time in seconds

#### `initializeControls()`

```typescript
protected abstract initializeControls(): void
```

Initialize control default values for your effect.

#### `getControlValues()`

```typescript
protected abstract getControlValues(): T
```

Retrieve current control values from global scope and process them as needed.

#### `updateParameters()`

```typescript
protected abstract updateParameters(controls: T): void
```

Update effect parameters with current control values.

**Parameters:**

- `controls`: Current control values object of type T

### Optional Methods to Override

#### `startAnimation()`

```typescript
protected startAnimation(): void
```

Starts the animation loop. Override to customize animation behavior.

#### `onFrame()`

```typescript
protected onFrame(time: number): void
```

Called on every animation frame. Override to add custom per-frame logic.

**Parameters:**

- `time`: Current time in seconds

#### `handleInitError()`

```typescript
protected handleInitError(error: unknown): void
```

Handle initialization errors. Override to customize error handling.

**Parameters:**

- `error`: The error that occurred

## 🖥️ WebGLEffect Class

The `WebGLEffect` class extends `BaseEffect` to provide WebGL-specific rendering capabilities using Three.js.

### Core Properties

| Property         | Type                             | Description                 |
| ---------------- | -------------------------------- | --------------------------- |
| `webGLContext`   | `WebGLContext`                   | Three.js renderer context   |
| `material`       | `THREE.ShaderMaterial`           | Shader material instance    |
| `customUniforms` | `Record<string, THREE.IUniform>` | Custom shader uniforms      |
| `fragmentShader` | `string`                         | Fragment shader code        |
| `vertexShader`   | `string`                         | Optional vertex shader code |

### Constructor

```typescript
constructor(config: WebGLEffectConfig)
```

Creates a new WebGL effect instance with the specified configuration.

**Parameters:**

- `config`: Configuration object extending EffectConfig with:
  - `fragmentShader`: GLSL fragment shader code
  - `vertexShader`: (Optional) GLSL vertex shader code

### Methods to Implement

When extending `WebGLEffect`, you must implement these methods:

#### `createUniforms()`

```typescript
protected abstract createUniforms(): Record<string, THREE.IUniform>
```

Create custom shader uniforms for your effect.

#### `updateUniforms()`

```typescript
protected abstract updateUniforms(controls: T): void
```

Update shader uniforms with current control values.

**Parameters:**

- `controls`: Current control values object of type T

## 🎨 CanvasEffect Class

The `CanvasEffect` class extends `BaseEffect` to provide 2D Canvas-specific rendering capabilities, perfect for effects that don't require WebGL.

### Core Properties

| Property          | Type                       | Description                      |
| ----------------- | -------------------------- | -------------------------------- |
| `ctx`             | `CanvasRenderingContext2D` | 2D canvas rendering context      |
| `backgroundColor` | `string`                   | Default background color         |
| `lastFrameTime`   | `number`                   | Time of last frame for delta     |
| `deltaTime`       | `number`                   | Time since last frame in seconds |

### Constructor

```typescript
constructor(config: CanvasEffectConfig)
```

Creates a new Canvas 2D effect instance with the specified configuration.

**Parameters:**

- `config`: Configuration object extending EffectConfig with:
  - `backgroundColor`: (Optional) Default background color, defaults to "black"

### Methods to Implement

When extending `CanvasEffect`, you must implement these methods:

#### `draw()`

```typescript
protected abstract draw(time: number, deltaTime: number): void
```

Draw the effect on the canvas for the current frame.

**Parameters:**

- `time`: Current time in seconds
- `deltaTime`: Time since last frame in seconds

#### `applyControls()`

```typescript
protected abstract applyControls(controls: T): void
```

Apply control values to the effect parameters.

**Parameters:**

- `controls`: Current control values object of type T

### Helper Methods

#### `clearCanvas()`

```typescript
protected clearCanvas(): void
```

Clears the canvas with the background color.

#### `loadResources()`

```typescript
protected async loadResources(): Promise<void>
```

Load effect resources (images, fonts, etc.). Override this method in subclasses if needed.

## 🎮 Decorator-Based Controls System

The controls system now uses TypeScript decorators to define user-configurable parameters directly in your effect classes.

### Control Decorators

| Decorator           | Description                           | Parameters                              |
| ------------------- | ------------------------------------- | --------------------------------------- |
| `@NumberControl`    | Creates a numeric slider control      | min, max, default, step, label, tooltip |
| `@BooleanControl`   | Creates a checkbox/toggle control     | default, label, tooltip                 |
| `@ComboboxControl`  | Creates a dropdown selection control  | values, default, label, tooltip         |
| `@HueControl`       | Creates a hue picker control          | min, max, default, label, tooltip       |
| `@ColorControl`     | Creates a color picker control        | default, label, tooltip                 |
| `@TextFieldControl` | Creates a text input control          | default, label, tooltip                 |
| `@Effect`           | Defines metadata for the effect class | name, description, author               |

### Usage Example

```typescript
@Effect({
  name: "Awesome Wave",
  description: "A colorful wave effect",
  author: "YourName",
})
export class AwesomeWaveEffect extends WebGLEffect<AwesomeWaveControls> {
  @NumberControl({
    label: "Animation Speed",
    min: 1,
    max: 10,
    default: 5,
    tooltip: "Controls how fast the wave moves",
  })
  speed!: number;

  @ComboboxControl({
    label: "Color Scheme",
    values: ["Rainbow", "Ocean", "Fire", "Neon"],
    default: "Rainbow",
    tooltip: "Select the color palette",
  })
  colorMode!: string;

  @BooleanControl({
    label: "Reverse Direction",
    default: false,
    tooltip: "Reverse the direction of wave movement",
  })
  reverseDirection!: boolean;

  // Implementation...
}
```

### Decorator Options

#### NumberControlOptions

```typescript
interface NumberControlOptions {
  label: string; // Display label
  min: number; // Minimum value
  max: number; // Maximum value
  default: number; // Default value
  step?: number; // Step increment (optional)
  tooltip?: string; // Help text (optional)
}
```

#### BooleanControlOptions

```typescript
interface BooleanControlOptions {
  label: string; // Display label
  default: boolean; // Default value
  tooltip?: string; // Help text (optional)
}
```

#### ComboboxControlOptions

```typescript
interface ComboboxControlOptions {
  label: string; // Display label
  values: string[]; // Array of options
  default: string; // Default value
  tooltip?: string; // Help text (optional)
}
```

### Control Value Utilities

#### `getControlValue()`

```typescript
function getControlValue<T>(propertyName: string, defaultValue: T): T;
```

Gets a control value from the global scope with fallback to default.

**Parameters:**

- `propertyName`: Name of the control
- `defaultValue`: Fallback value if control is undefined

**Returns:** The control value with type T

#### `normalizeSpeed()`

```typescript
function normalizeSpeed(speed: number): number;
```

Normalizes a speed value from the SignalRGB range (1-10) to a multiplier (0.2-3.0).

**Parameters:**

- `speed`: Raw speed value (1-10)

**Returns:** Normalized speed multiplier (0.2-3.0)

#### `normalizePercentage()`

```typescript
function normalizePercentage(
  value: number,
  defaultValue = 100,
  minValue = 0.01,
): number;
```

Normalizes a percentage value to a factor.

**Parameters:**

- `value`: Raw percentage value (typically 0-200)
- `defaultValue`: Default percentage (default: 100)
- `minValue`: Minimum allowed output value (default: 0.01)

**Returns:** Normalized factor value

#### `boolToInt()`

```typescript
function boolToInt(value: boolean | number): number;
```

Converts a boolean value to 0 or 1.

**Parameters:**

- `value`: Boolean or number value

**Returns:** 1 if true/non-zero, 0 if false/zero

#### `comboboxValueToIndex()`

```typescript
function comboboxValueToIndex(
  value: string | number,
  options: string[],
  defaultIndex = 0,
): number;
```

Converts a string value from a combobox to its numeric index.

**Parameters:**

- `value`: Current value (string or number)
- `options`: Array of possible string values
- `defaultIndex`: Default index if not found (default: 0)

**Returns:** Numeric index in the options array

#### `getAllControls()`

```typescript
function getAllControls<T extends Record<string, unknown>>(controls: T): T;
```

Fetches all control values from the window object based on a default values object.

**Parameters:**

- `controls`: Dictionary of control names and default values

**Returns:** Object with all control values

## 🖥️ WebGL Utilities

Utilities for WebGL and Three.js integration.

### `WebGLContext`

Interface representing an initialized WebGL context.

```typescript
interface WebGLContext {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  clock: THREE.Clock;
}
```

### `initializeWebGL()`

```typescript
function initializeWebGL(options: WebGLSetupOptions = {}): WebGLContext;
```

Initialize the WebGL context, renderer, scene and camera.

**Parameters:**

- `options`: Configuration options
  - `canvasId`: Canvas element ID (default: "exCanvas")
  - `canvasWidth`: Canvas width (default: 320)
  - `canvasHeight`: Canvas height (default: 200)
  - `antialias`: Enable antialiasing (default: false)
  - `forceFallback`: Force software renderer (default: false)

**Returns:** Initialized WebGL context

### `createShaderQuad()`

```typescript
function createShaderQuad(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  vertexShader?: string,
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial };
```

Create a full-screen quad for shader effects.

**Parameters:**

- `fragmentShader`: Fragment shader source code
- `uniforms`: Shader uniforms object
- `vertexShader`: (Optional) Custom vertex shader

**Returns:** Created mesh and material

### `createStandardUniforms()`

```typescript
function createStandardUniforms(
  canvas: HTMLCanvasElement,
): Record<string, THREE.IUniform>;
```

Create standard Three.js uniforms for effects.

**Parameters:**

- `canvas`: Canvas element

**Returns:** Object with standard uniforms:

- `iTime`: Time in seconds
- `iResolution`: Canvas dimensions
- `iMouse`: Mouse position

## 🐞 Debug Tools

Utilities for debugging and logging.

### `createDebugLogger()`

```typescript
function createDebugLogger(
  namespace: string,
  enabled = true,
): (...args: unknown[]) => void;
```

Creates a debug logger function with a specific namespace.

**Parameters:**

- `namespace`: Namespace prefix for log messages
- `enabled`: Whether debug logging is enabled (default: true)

**Returns:** A function that logs messages with the specified namespace

### `debug()`

```typescript
function debug(...args: unknown[]): void;
```

Default debug logger with no namespace.

**Parameters:**

- `args`: Arguments to log

## 📋 Types & Definitions

Type definitions for the framework.

### `ControlDefinition`

Base interface for all control definitions.

```typescript
interface ControlDefinition {
  id: string;
  type: string;
  label: string;
  default: unknown;
  tooltip?: string;
  [key: string]: unknown;
}
```

### Control Types

#### `NumberControlDefinition`

```typescript
interface NumberControlDefinition extends ControlDefinition {
  type: "number";
  min: number;
  max: number;
  default: number;
  step?: number;
}
```

#### `BooleanControlDefinition`

```typescript
interface BooleanControlDefinition extends ControlDefinition {
  type: "boolean";
  default: boolean | number;
}
```

#### `ComboboxControlDefinition`

```typescript
interface ComboboxControlDefinition extends ControlDefinition {
  type: "combobox";
  values: string[];
  default: string;
}
```

### `EffectConfig`

Configuration for initializing a BaseEffect.

```typescript
interface EffectConfig {
  id: string;
  name: string;
  debug?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}
```

### `EffectOptions`

Options for the Effect decorator.

```typescript
interface EffectOptions {
  name: string;
  description: string;
  author: string;
}
```

### Global Types

The framework extends the global Window interface:

```typescript
interface Window {
  update?: UpdateFunction;
  [key: string]: unknown;
  WebGLRenderingContext?: unknown;
}
```

## ⚙️ Utility Functions

Additional utility functions for convenience.

### `initializeEffect()`

```typescript
function initializeEffect(initFunction: () => void): void;
```

Initializes a SignalRGB effect when the page loads.

**Parameters:**

- `initFunction`: Function to call for initialization

## 🚀 Build System

LightScript Workshop uses a custom Vite-based build system with specialized plugins.

### Vite Plugins

#### `lightscriptDecoratorsPlugin`

Adds runtime support for decorators in development mode.

#### `signalRGBPlugin`

Generates SignalRGB-compatible HTML files from your TypeScript effect code.

### Build Commands

| Command                                               | Description                  |
| ----------------------------------------------------- | ---------------------------- |
| `npm run dev`                                         | Start development server     |
| `npm run build`                                       | Build all effects            |
| `EFFECT=effect-id npm run build`                      | Build a single effect        |
| `NO_MINIFY=true EFFECT=effect-id npm run build:debug` | Build with debugging support |
