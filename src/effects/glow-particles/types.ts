/**
 * GlowParticles - Types and Constants
 * Defines interfaces, types, and constants used by the GlowParticles effect
 */

// Define control interface
export interface GlowParticlesControls {
  speed: number;
  particleCount: number;
  particleSize: number;
  glowIntensity: number;
  colorMode: number;
  flowDirection: number;
  connectParticles: boolean;
  particleBounce: boolean;
  colorSaturation: number;
  colorIntensity: number;
  connectorGlow: number;
}

// Color modes in alphabetical order
export const COLOR_MODES = [
  "Aurora",
  "Cyberpunk",
  "Fire and Ice",
  "Galaxy",
  "Heat Map",
  "Neon",
  "Ocean",
  "Pastel",
  "Prism",
  "Rainbow",
  "Sunset",
  "Synthwave",
];

// Flow directions
export const FLOW_DIRECTIONS = [
  "Outward",
  "Circular",
  "Left to Right",
  "Right to Left",
  "Top to Bottom",
  "Bottom to Top",
  "Random",
];
