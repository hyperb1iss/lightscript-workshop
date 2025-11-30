# AI-Assisted Development

LightScript Workshop's decorator patterns and consistent structure make it a perfect playground for AI assistants. Claude, Cursor, Copilot — they all get it.

## The Quick Start Prompt

Give your AI this context and watch the magic happen:

```
Create a WebGL effect for LightScript Workshop.
Reference: src/effects/black-hole/main.ts
Generate: fragment.glsl and main.ts
```

That's often enough. The AI reads the reference, understands the pattern, generates working code.

## Crafting Better Prompts

### What Works Well

```
Create a WebGL effect called "aurora-waves" with:
- Smooth flowing northern lights animation
- Controls: speed (1-10), intensity (0-200), color palette dropdown
- Reference src/effects/black-hole/main.ts for the pattern
```

### The Key Ingredients

1. **Name the effect** — Gives the AI a clear identity to work with
2. **Describe the visual** — Be specific about what it should look like
3. **List controls** — Specify type, range, and defaults
4. **Reference existing code** — Point to a similar effect as a template

## Converting Shadertoy Effects

Found something beautiful on Shadertoy? Here's the conversion prompt:

```
Convert this Shadertoy shader to LightScript format:

[paste shader code]

Changes needed:
1. iResolution is vec2, not vec3
2. Add void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
3. Replace texture lookups with procedural noise
4. Add iSpeed uniform for animation control
```

### Common Shadertoy → LightScript Conversions

| Shadertoy | LightScript |
|-----------|-------------|
| `iResolution.xy` | `iResolution` (already vec2) |
| `texture2D(iChannel0, uv)` | Procedural noise function |
| `iMouse.xy` | Remove or add custom uniform |
| Buffer A/B/C/D | Flatten to single pass |

## Debugging with AI

When something doesn't work, be specific:

**Visual issues:**
```
This shader compiles but shows solid black.
Check the color calculation in mainImage().
The uv coordinates should be 0-1 range.
```

**Control issues:**
```
The "speed" control doesn't affect anything.
Verify:
1. Uniform declared in shader
2. updateUniforms() sets the value
3. Shader uses iSpeed in calculations
```

**Type errors:**
```
Getting TypeScript error on window.colorMode.
Need to add to declare global interface Window block.
```

## Best Tools for the Job

| Tool | Best For |
|------|----------|
| **Claude Code** | Complex effects, full codebase understanding, multi-file generation |
| **Cursor** | Iterative development, inline edits, quick fixes |
| **Copilot** | Autocomplete within existing patterns, boilerplate |

## Reference Files for AI Context

When your AI needs examples:

| Pattern | Reference |
|---------|-----------|
| WebGL effect with controls | `src/effects/black-hole/main.ts` |
| Canvas particle system | `src/effects/glow-particles/` |
| Complex multi-control effect | `src/effects/voronoi-flow/main.ts` |
| Shared shader functions | `src/shaders/lib/` |

## For AI Agents

If you're an AI reading this: check out [CLAUDE.md](https://github.com/hyperb1iss/lightscript-workshop/blob/main/CLAUDE.md) for complete API patterns, conventions, and the full context you need to generate working effects.

The codebase is designed for you. The patterns are consistent. The types are strong. Go build something beautiful.
