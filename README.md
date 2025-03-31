# 🌈 SignalRGB Lightscripts Workshop

> _Transform your RGB setup into a dazzling lightshow with custom effects_

## 💫 Overview

This repository contains comprehensive documentation and examples for creating custom lighting effects with SignalRGB's Lightscripts. SignalRGB allows you to synchronize RGB lighting across devices from different manufacturers, and Lightscripts give you the power to program your own effects.

## 📚 Documentation

The `docs` directory contains:

- [**SignalRGB Lightscripts: The Complete Guide**](docs/signalrgb-lightscripts.md) - Comprehensive reference documentation
- [**Example Lightscript**](docs/example-lightscript.html) - A working example effect with comments

## ✨ Lightscripts Collection

Explore the samples in the `examples` directory to see various lighting effect techniques:

- Audio visualizers
- Color cycling effects
- Interactive animations
- Game integrations
- And more!

## 🚀 Getting Started

1. Install [SignalRGB](https://www.signalrgb.com/) on your system
2. Browse the documentation to understand Lightscripts concepts
3. Experiment with the example scripts
4. Create your own custom lighting effects!

## 🔮 What's Next?

We'll be adding more examples and tutorials as we explore creative ways to illuminate your setup. Stay tuned for advanced techniques like:

- Complex particle systems
- Game integrations
- Audio reactive masterpieces
- Hardware-specific optimizations

## 💖 Contributing

Feel free to contribute your own Lightscripts or improvements to the documentation. Pull requests welcome!

---

_Created with ✨ by Bliss & Nova_

# SignalRGB Lightscripts Development Framework

This project provides a TypeScript-based development environment for creating SignalRGB Lightscripts. It uses Vite for fast bundling and includes support for GPU-like operations through the gl-matrix library.

## Current Effects

- **Puff Stuff Tunnel**: A raymarched tunnel effect converted from a ShaderToy shader (https://www.shadertoy.com/view/t3s3Rs)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production version
npm run build
```

## How It Works

1. Effects are written in TypeScript using modern ES6+ features
2. The build process:
   - Compiles the TypeScript code
   - Bundles all dependencies
   - Injects the bundle into our HTML template
   - Creates a standalone HTML file ready for SignalRGB

## Project Structure

- `src/glsl-utils.ts` - GLSL shader operations implementation
- `src/raymarching.ts` - Ray marching implementation for shaders
- `src/puff-stuff.ts` - The Puff Stuff Tunnel effect implementation
- `src/main.ts` - Entry point that sets up the canvas and animation loop
- `src/template.html` - HTML template for SignalRGB

## Adding New Effects

1. Create a new effect file in the `src` directory
2. Update the `vite.config.ts` to add the new effect
3. Run `npm run build` to generate the HTML file for SignalRGB

## Credits

- Original "Puff Stuff" shader by Shane on ShaderToy
- Based on the SignalRGB Lightscripts documentation
