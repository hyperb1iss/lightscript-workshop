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
    author: "hyperb1iss",
    entry: "./effects/puff-stuff/main.ts",
    template: "./effects/puff-stuff/template.html",
  },
  {
    id: "simple-wave",
    name: "Simple Wave",
    description: "A simple wave-based RGB effect with minimal resource usage",
    author: "hyperb1iss",
    entry: "./effects/simple-wave/main.ts",
    template: "./effects/simple-wave/template.html",
  },
  {
    id: "glow-particles",
    name: "Glow Particles",
    description:
      "A colorful particle system with glowing effects using Canvas 2D",
    author: "hyperb1iss",
    entry: "./effects/glow-particles/main.ts",
    template: "./effects/glow-particles/template.html",
  },
  {
    id: "cyber-descent",
    name: "Cyber Descent",
    description: "A cyberpunk city flying effect inspired by classic demos",
    author: "hyperb1iss",
    entry: "./effects/cyber-descent/main.ts",
    template: "./effects/cyber-descent/template.html",
  },
];
