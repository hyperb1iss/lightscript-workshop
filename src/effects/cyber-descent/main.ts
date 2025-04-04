/**
 * Cyber Descent - Entry Point
 * Main entry point for the Cyber Descent effect
 *
 * https://www.shadertoy.com/view/wdfGW4
 */

import { initializeEffect } from "../../core";
import { CyberDescentEffect } from "./cyber-descent-effect";

// Create and export the effect instance
const effect = new CyberDescentEffect();

// Initialize the effect
initializeEffect(() => {
  effect.initialize();
});

export default effect;
