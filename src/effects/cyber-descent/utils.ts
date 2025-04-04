/**
 * Cyber Descent - Utility Functions
 * Helper functions for the Cyber Descent effect
 */

import { CyberDescentControls, CYBERPUNK_MODES } from "./types";
import { getControlValue, normalizeSpeed } from "../../common/controls";

/**
 * Initialize default control values in the global scope
 */
export function initializeCyberDescentControls(): void {
  // Set default values for the controls
  window.speed = 5;
  window.zoom = 10;
  window.cyberpunkMode = CYBERPUNK_MODES[0];
  window.fogDensity = 100;
  window.lightIntensity = 100;
  window.colorSaturation = 100;
  window.colorIntensity = 100;
}

/**
 * Get the current control values from the global scope
 */
export function getCyberDescentControls(): CyberDescentControls {
  // Handle cyberpunkMode conversion from string to number index
  const rawCyberpunkMode = getControlValue("cyberpunkMode", CYBERPUNK_MODES[0]);
  let cyberpunkMode: number = 0;

  if (typeof rawCyberpunkMode === "string") {
    const modeIndex = CYBERPUNK_MODES.indexOf(rawCyberpunkMode);
    cyberpunkMode = modeIndex === -1 ? 0 : modeIndex;
  } else {
    cyberpunkMode = rawCyberpunkMode;
  }

  return {
    speed: normalizeSpeed(getControlValue("speed", 5)),
    zoom: getControlValue("zoom", 10) / 10, // Scale zoom for shader use
    cyberpunkMode,
    fogDensity: getControlValue("fogDensity", 100) / 100, // Normalize to 0-1 range
    lightIntensity: getControlValue("lightIntensity", 100) / 100, // Normalize to 0-1 range
    colorSaturation: getControlValue("colorSaturation", 100) / 100, // Normalize to 0-1 range
    colorIntensity: getControlValue("colorIntensity", 100) / 100, // Normalize to 0-1 range
  };
}
