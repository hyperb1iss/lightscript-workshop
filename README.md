<div align="center">

# 🌠 LightScript Workshop for SignalRGB 🔮

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=for-the-badge&logo=webgl&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

_Create stunning RGB lighting effects with modern tools_

</div>

LightScript Workshop is a modern TypeScript framework for creating beautiful RGB lighting effects for [SignalRGB](https://signalrgb.com/). Transform the way you build Lightscripts with a type-safe, component-based approach featuring hot reloading, WebGL integration, and an efficient build system.

## ⚡ Features

- **🔷 Modern TypeScript** - Full type safety prevents runtime errors
- **🔮 Three.js Integration** - Powerful WebGL rendering capabilities
- **⚡ Hot Reloading** - Instant visual feedback while coding
- **🕹️ Declarative Controls** - Define UI elements with simple HTML
- **⚙️ Optimized Build Pipeline** - Production-ready effects
- **🧪 Testing Framework** - Maintain quality with Vitest

## 🌐 Quick Start

```bash
# Clone the repository
git clone https://github.com/hyperb1iss/lightscript-workshop.git
cd lightscript-workshop

# Install dependencies
npm install

# Start development server
npm run dev
```

Then open your browser to http://localhost:3000 to see the default effect. Add `?effect=effect-name` to the URL to view specific effects.

## 📚 Documentation

We've created comprehensive documentation to help you get the most out of LightScript Workshop:

- [**Developer Guide**](/docs/developer-guide.md) - Start here for a complete introduction
- [**API Reference**](/docs/api-reference.md) - Detailed technical documentation
- [**Examples**](/docs/examples.md) - Ready-to-use effect examples with explanations
- [**Advanced Guide**](/docs/advanced.md) - Deep dives into advanced techniques

## 🌈 Example Effects

The framework includes these demonstration effects:

### 🌀 Puff Stuff Tunnel

A ray-marched tunnel effect with dynamic colors and style options.

**Key features:**

- Ray marching in fragment shader
- Multiple color schemes
- Dynamically adjustable parameters

### 🌊 Simple Wave

A wave-based RGB effect showcasing smooth animation and minimal resource usage.

**Key features:**

- Sine wave generation
- Multiple color modes
- Optimized for performance

## 💻 Development Workflow

1. **Create** a new effect directory in `src/effects/your-effect-name/`

   ```
   effects/your-effect-name/
   ├── fragment.glsl  # Shader code
   ├── main.ts        # Effect implementation
   └── template.html  # HTML template with controls
   ```

2. **Register** your effect in `src/index.ts`

3. **Develop** with live reloading

   ```bash
   npm run dev
   ```

4. **Build** for SignalRGB

   ```bash
   EFFECT=your-effect-name npm run build
   ```

5. **Import** the generated HTML file into SignalRGB

## 🔬 Creating a Custom Effect

Creating a new effect is easy with the LightScript framework:

1. Create effect directory structure
2. Define HTML template with controls
3. Create GLSL shader for visuals
4. Implement TypeScript class extending BaseEffect
5. Register your effect

Check the [Developer Guide](/docs/developer-guide.md) for a complete walkthrough.

## ⚙️ Building & Deployment

### Building a Single Effect

```bash
EFFECT=effect-name npm run build
```

### Building All Effects

```bash
npm run build
```

### Debug Builds

For easier troubleshooting:

```bash
NO_MINIFY=true EFFECT=effect-name npm run build:debug
```

## 🎮 SignalRGB Integration

1. Build your effect using the commands above
2. Open SignalRGB application
3. Navigate to "Lighting Effects"
4. Click "Import from File"
5. Select your HTML file from the `dist/` directory

## 🤝 Contributing

Contributions are welcome! Whether you're fixing bugs, improving documentation, or creating new effects, please feel free to jump in. Check out our existing issues or open a new one to discuss proposed changes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Created by [Stefanie Jane 🌠](https://github.com/hyperb1iss)

If you love lightscript-workshop, star the repo and [buy me a Monster Ultra Violet](https://ko-fi.com/hyperb1iss)! ⚡️

</div>
