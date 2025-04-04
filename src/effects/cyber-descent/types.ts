/**
 * Cyber Descent - Types and Constants
 * Defines interfaces, types, and constants used by the Cyber Descent effect
 */

import { BaseControls } from "../../common/controls";

// Define control interface
export interface CyberDescentControls extends BaseControls {
  speed: number;
  zoom: number;
  cyberpunkMode: number;
  fogDensity: number;
  lightIntensity: number;
  colorSaturation: number;
  colorIntensity: number;
}

// Cyberpunk modes available in the effect
export const CYBERPUNK_MODES = [
  "Standard", // Default mode
  "Fast Descent", // Faster, more intense descent
  "Neon", // Custom neon colors mode
];
