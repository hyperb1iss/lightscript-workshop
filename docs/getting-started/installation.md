# Installation

Let's get you set up. Five minutes from now, you'll be watching your first effect come alive.

## Prerequisites

Before we begin, you'll need:

| Tool | Why |
|------|-----|
| **Node.js 18+** | [Download here](https://nodejs.org/) — the JavaScript runtime |
| **pnpm** | `npm install -g pnpm` — fast, efficient package manager |
| **Git** | For cloning the repo |
| **VS Code** | Recommended editor with great GLSL support |

### Recommended VS Code Extensions

- **[GLSL Lint](https://marketplace.visualstudio.com/items?itemName=dtoplak.vscode-glsllint)** — Shader syntax highlighting and error checking
- **[WebGL GLSL Editor](https://marketplace.visualstudio.com/items?itemName=raczzalan.webgl-glsl-editor)** — Enhanced GLSL editing experience

### Optional But Nice

- **SignalRGB** — For testing on actual hardware (the whole point, really)
- **Claude/Cursor** — AI assistants that understand the codebase patterns

## Get the Code

```bash
git clone https://github.com/hyperb1iss/lightscript-workshop.git
cd lightscript-workshop
```

## Install Dependencies

```bash
pnpm install
```

This pulls in:
- **Vite** — Lightning-fast bundler with hot reloading
- **Three.js** — WebGL rendering foundation
- **Preact** — Lightweight UI for the dev environment
- **TypeScript** — Type safety for everything

## Fire It Up

```bash
pnpm dev
```

You should see something like:

```
─────────────────────────────────────────
◈ LightScript Workshop  v1.0.0
─────────────────────────────────────────

  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:4096/
```

Open [localhost:4096](http://localhost:4096) in your browser. You'll see:

- A canvas displaying the current effect
- A control panel on the right for tweaking parameters
- An effect selector to browse all available effects

If everything's working, you're ready to create.

## Editor Setup

### VS Code Settings

For the best experience, add to `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "[glsl]": {
    "editor.defaultFormatter": "raczzalan.webgl-glsl-editor"
  }
}
```

### What's Pre-Configured

The project comes with:
- **Decorators enabled** — For the control system magic
- **Path aliases** — Clean imports like `@lightscript/core`
- **Strict TypeScript** — Maximum type safety

You don't need to configure anything. Just write code.

## Troubleshooting

### "Cannot find module '@lightscript/core'"

Make sure you're running commands from the repository root, not a subdirectory. The path aliases need the correct context.

### Port 4096 already in use

```bash
# Kill whatever's hogging the port
lsof -ti:4096 | xargs kill -9

# Or use a different port
pnpm dev -- --port 3000
```

### Shader compilation errors

Check the browser console. Common GLSL issues:
- Missing semicolons (GLSL requires them, unlike modern JavaScript)
- Undeclared variables (no implicit globals)
- Type mismatches (can't add `int` to `float` without casting)

## Next Steps

You're set up. Now let's build something:

- [Quick Start](/getting-started/quick-start) — Create your first effect
- [Project Structure](/getting-started/project-structure) — Understand the codebase layout
