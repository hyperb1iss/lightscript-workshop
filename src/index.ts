/**
 * Main entry point for the build process
 * This file exports all available effects for discovery
 */

// Available effects with metadata
export const effects = [
  {
    id: "puff-stuff",
    name: "Puff Stuff Tunnel",
    description: "A raymarched tunnel effect with dynamic colors and styles",
    author: "Bliss",
    entry: "./effects/puff-stuff/main.ts",
    template: "./effects/puff-stuff/template.html",
  },
  {
    id: "simple-wave",
    name: "Simple Wave",
    description: "A simple wave-based RGB effect with minimal resource usage",
    author: "Bliss",
    entry: "./effects/simple-wave/main.ts",
    template: "./effects/simple-wave/template.html",
  },
  {
    id: "glow-particles",
    name: "Glow Particles",
    description:
      "A colorful particle system with glowing effects using Canvas 2D",
    author: "Bliss",
    entry: "./effects/glow-particles/main.ts",
    template: "./effects/glow-particles/template.html",
  },
];
