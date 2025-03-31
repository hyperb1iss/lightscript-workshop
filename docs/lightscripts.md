# SignalRGB Lightscripts: Developer Guide

## Introduction

SignalRGB Lightscripts are HTML5 canvas-based effects that can control RGB lighting across devices. This guide covers everything from basic structure to advanced techniques for creating custom lighting effects.

## 1. Core Structure

A Lightscript is essentially a webpage with three required HTML tags:

### `<head>`

Contains metadata and control definitions:

- `<title>` - Names your effect in the SignalRGB app
- `<meta>` - Defines user controls and API access

### `<body>`

Contains only the canvas element:

```html
<body style="margin: 0; padding: 0;">
  <canvas id="exCanvas" width="320" height="200"></canvas>
</body>
```

### `<script>`

Contains your JavaScript code with three essential components:

- Variable declarations
- Update function
- Initial update call

```html
<script>
  // Get the canvas element from the DOM
  var c = document.getElementById("exCanvas");
  var ctx = c.getContext("2d");
  var width = 320;
  var height = 200;
  var hue = 0;

  function update() {
    // Animation code here

    // Re-call at end of each frame
    window.requestAnimationFrame(update);
  }

  // Initial update call
  window.requestAnimationFrame(update);
</script>
```

## 2. The Canvas Element

The canvas is where all visual effects are rendered. Standard dimensions are 320×200px.

### Basic Drawing Operations

1. **Set fill style** using `ctx.fillStyle`

   ```javascript
   ctx.fillStyle = "hsl(" + hue + ", 100%, 50%)";
   ```

2. **Draw shapes** using methods like:

   ```javascript
   ctx.fillRect(0, 0, width, height); // Rectangle
   ctx.arc(x, y, radius, startAngle, endAngle); // Circle/arc
   ```

3. **Path-based drawing** with:
   ```javascript
   ctx.beginPath();
   ctx.moveTo(x1, y1);
   ctx.lineTo(x2, y2);
   ctx.stroke(); // For outlines
   ctx.fill(); // For filled shapes
   ```

### Animation Principles

For animation, modify variables over time in the update function:

```javascript
function update() {
  // Clear previous frame
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  // Update variables for animation
  hue += speed / 4;
  if (hue > 360) {
    hue = hue % 360;
  }

  // Draw with updated variables
  ctx.fillStyle = "hsl(" + hue + ", 100%, 50%)";
  ctx.fillRect(0, 0, width, height);

  // Request next frame
  window.requestAnimationFrame(update);
}
```

> **IMPORTANT**: Always use `window.requestAnimationFrame()` instead of direct function calls to maintain timing consistency between frames.

## 3. User Controls

Add customizable controls in the `<head>` section:

### Number Slider

```html
<meta
  property="speed"
  label="Cycle Speed"
  type="number"
  min="1"
  max="10"
  default="2"
/>
```

### Hue Slider

```html
<meta
  property="colorHue"
  label="Color"
  type="hue"
  default="120"
  min="0"
  max="360"
/>
```

### Boolean Switch

```html
<meta
  property="enableEffect"
  label="Enable Effect"
  type="boolean"
  default="1"
/>
```

### Color Picker

```html
<meta
  property="myColor"
  label="Custom Color"
  type="color"
  default="#009bde"
  min="0"
  max="360"
/>
```

### Text Field

```html
<meta
  property="textInput"
  label="Custom Text"
  type="textfield"
  default="Hello"
/>
```

### Combo Box

```html
<meta
  property="mode"
  label="Effect Mode"
  type="combobox"
  values="Wave,Pulse,Static"
  default="Wave"
/>
```

## 4. Smart Tags (Meters)

Meters capture visual information from applications to trigger effects:

### Linear Meter

Detects color along a horizontal line:

```html
<meta
  meter="health"
  type="linear"
  x=".05"
  y=".9"
  width=".189"
  h="70-140"
  s="40-100"
  l="40-100"
/>
```

### Area Meter

Detects color in a rectangular area:

```html
<meta
  meter="skillIcon"
  type="area"
  x=".1729"
  y=".9740"
  width=".0390"
  height=".02"
  h="0-360"
  s="0-10"
  l="90-100"
/>
```

### OCR Text Match

Detects specific text in an area:

```html
<meta
  meter="victoryText"
  type="ocr_textmatch"
  x=".1729"
  y=".9740"
  width=".0390"
  height=".02"
  string="VICTORY"
  confidence="70"
/>
```

### OCR Numeric

Detects numbers in an area:

```html
<meta
  meter="scoreValue"
  type="ocr_numeric"
  x=".1729"
  y=".9740"
  width=".0390"
  height=".02"
  confidence="70"
/>
```

### Resolution Adjustment

Add resolution-specific coordinates:

```html
<meta meter="health" type="linear" x=".05" y=".9" width=".189" h="70-140" s="40-100" l="40-100">
    <resolution size="3440x1440" x="0.1666" y="0.8993" width="0.1541"/>
    <resolution size="1920x1080" x="0.0557" y="0.9083" width="0.199"/>
</meta>
```

> **NOTE**: Coordinates must be normalized (0.0-1.0) by dividing pixel positions by screen dimensions.

## 5. Content Properties

Additional data sources from SignalRGB:

### Audio Data

- `engine.audio.level` - Volume level (-100 to 0)
- `engine.audio.density` - Tone roughness (0 to 1)
- `engine.audio.width` - Stereo width (0 to 1)
- `engine.audio.freq` - 200-element frequency array

### Screen Data

- `engine.zone.hue` - 560-element array of screen hue values
- `engine.zone.saturation` - 560-element array of screen saturation values
- `engine.zone.lightness` - 560-element array of screen lightness values

## 6. Programming Patterns

### The Meter Class

Tracks changes in meter values with stability detection:

```javascript
function Meter(size, callback) {
  this.size = size; // Stability threshold
  this.value = 0; // Current value
  this.diff = 0; // Change amount
  this.increased = false; // Did value increase?
  this.decreased = false; // Did value decrease?
  var values = []; // Value history array

  this.setValue = function (updatedValue) {
    // Add new value and remove oldest if needed
    values.push(updatedValue);
    if (values.length > this.size) {
      values.shift();
    }

    // Check if values are stable (all the same)
    for (var i = 0; i < values.length - 1; i++) {
      if (values[i] !== values[i + 1]) return;
    }

    // If stable and changed, update properties and execute callback
    if (this.value !== values[0]) {
      this.diff = Math.abs(this.value - values[0]);
      this.increased = this.value < values[0];
      this.decreased = this.value > values[0];
      this.value = values[0];
      callback();
    }
  };
}
```

Usage:

```javascript
// Initialize meter with stability threshold and callback
var healthMeter = new Meter(5, healthEffectCallback);

// In update function:
healthMeter.setValue(engine.vision.health);

// Callback function
function healthEffectCallback() {
  if (healthMeter.decreased && healthMeter.diff > 0.1) {
    effects.push(new DamageEffect());
  }
}
```

### State Handler

Manages priority effects:

```javascript
function StateHandler() {
  var stack = [];
  var state = null;

  var updateState = function () {
    state = stack.length > 0 ? stack[stack.length - 1] : null;
  };

  this.Push = function (newState) {
    stack.push(newState);
    updateState();
  };

  this.Pop = function () {
    stack.pop();
    updateState();
  };

  this.Process = function () {
    if (state !== null) {
      state.Process();
    }
  };
}
```

### Effect Handler

Simple array for multiple simultaneous effects:

```javascript
// Effects array
let effects = [];

// In update function:
for (let i = 0; i < effects.length; i++) {
  effects[i].draw();
  if (effects[i].lifetime <= 0) {
    effects.splice(i, 1);
  }
}
```

### Effect Function Example

```javascript
function DamageEffect() {
  this.lifetime = 200;
  this.color = "red";

  this.draw = function () {
    ctx.fillStyle = this.color;
    ctx.fillRect(0, height - this.lifetime, width, 30);
    this.lifetime -= 5;
  };
}
```

## 7. Canvas Animation Techniques

### Basic Color Cycle

```javascript
function update() {
  // Set color using HSL
  ctx.fillStyle = "hsl(" + hue + ", 100%, 50%)";
  // Fill the canvas
  ctx.fillRect(0, 0, width, height);
  // Update hue for next frame
  hue += speed / 4;
  if (hue > 360) {
    hue = hue % 360;
  }
  // Request next frame
  window.requestAnimationFrame(update);
}
```

### Using Time for Animation

```javascript
function update() {
  // Get current time in milliseconds
  let time = Date.now() / 100;

  // Use sine/cosine for oscillation
  let x = centerX + Math.cos(time) * radius;
  let y = centerY + Math.sin(time) * radius;

  // Draw with calculated position
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();

  window.requestAnimationFrame(update);
}
```

### Drawing with Iteration (Grids & Patterns)

```javascript
function update() {
  for (let i = 0; i < 8; i++) {
    // Calculate position based on index
    let x = i * 20;

    // Alternate colors
    if (i % 2 == 0) {
      ctx.fillStyle = "black";
    } else {
      ctx.fillStyle = "white";
    }

    // Draw rectangle
    ctx.beginPath();
    ctx.rect(x, 20, 20, 20);
    ctx.fill();
  }

  window.requestAnimationFrame(update);
}
```

## 8. Advanced Features

### SVG Paths Integration

Import SVG path data from design tools:

```javascript
// SVG path data from Illustrator
const pathData = "M351 396.5 440 435.5 501.84 435.5...";

// Create Path2D object
const path = new Path2D(pathData);

function update() {
  // Apply transforms if needed
  ctx.scale(0.3, 0.3);

  // Set fill style
  ctx.fillStyle = "blue";

  // Draw the path
  ctx.fill(path);

  // Reset transform
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  window.requestAnimationFrame(update);
}
```

### Audio Visualization

```javascript
function update() {
  // Get audio data
  var frequency = new Int8Array(engine.audio.freq);
  var level = engine.audio.level;
  var density = engine.audio.density;

  // Process frequency data
  var reducedFreq = frequency.filter((element, index) => {
    return index % 4 === 0;
  });

  // Normalize values
  var max = Math.max(...reducedFreq);
  var min = Math.min(...reducedFreq);

  // Draw visualizer
  for (let i = 0; i < reducedFreq.length; i++) {
    var height = ((Math.abs(reducedFreq[i]) - min) / (max - min)) * -40;
    var hue = density * 360;

    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(i * 5, 100, 4, height);
  }

  window.requestAnimationFrame(update);
}
```

### Game/App Integration

Use HTTP requests to control SignalRGB effects from external applications:

```javascript
// Effect HTTP API
// URL: http://localhost:16034/canvas/event?sender=yourAppName&event=yourEvent

// In your Lightscript:
function onCanvasApiEvent(apiEvent) {
  if (apiEvent["sender"] == "yourAppName") {
    let eventType = apiEvent["event"];

    if (eventType == "skill1") {
      effects.push(new Skill1Effect());
    } else if (eventType == "damage") {
      effects.push(new DamageEffect());
    }
  }
}
```

## 9. Troubleshooting

### Common Issues

1. **Broken meters**: Check normalized coordinates and HSL ranges
2. **Console errors**: Look for undefined variables or syntax errors
3. **Inconsistent triggering**: Adjust meter stability thresholds
4. **Effect doesn't appear**: Verify callback conditions
5. **High CPU usage**: Optimize drawing operations, reduce meter size

### Debugging Process

1. **Check console** for errors
2. **Verify meters** are triggering (use Meter Inspector)
3. **Add console.logs** to track execution flow
4. **Isolate problematic code** in a test environment
5. **Test across multiple resolutions** for game integrations

### Required Resolutions

Always support these aspect ratios:

- **16:9** (1920x1080, 2560x1440, etc.)
- **16:10** (1920x1200, etc.)
- **21:9** (3440x1440, etc.)

## 10. Best Practices

1. **Keep meters small** and precise to minimize CPU usage
2. **Organize code** with clear naming conventions
3. **Use classes** for encapsulating effects
4. **Separate logic** into distinct functions
5. **Comment your code** thoroughly
6. **Test across all resolutions** for game integrations
7. **Limit direct drawing** in the update function
8. **Use `window.requestAnimationFrame`** for all animations
9. **Clear the canvas** at the beginning of each frame
10. **Handle edge cases** in user controls

---

This guide covers the fundamentals of creating SignalRGB Lightscripts. For additional examples and advanced techniques, refer to the complete documentation.
