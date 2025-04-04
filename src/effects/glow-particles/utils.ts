/**
 * GlowParticles - Utility Functions
 * Helper functions for the GlowParticles effect
 */
import { COLOR_MODES, FLOW_DIRECTIONS, GlowParticlesControls } from "./types";
import {
  normalizePercentage,
  boolToInt,
  getControlValue,
  comboboxValueToIndex,
} from "../../common/controls";

/**
 * Get current GlowParticles control values from global scope
 * Extracts and normalizes values from SignalRGB controls
 */
export function getGlowParticlesControls(): GlowParticlesControls {
  // Create a speed scale that varies from 0.5 to 3.0 based on control value (1-10)
  // This gives a better range for visible speed differences
  const rawSpeed = getControlValue<number>("speed", 3);
  const smoothSpeed = 0.5 + (rawSpeed - 1) * 0.28;

  // Get all controls with appropriate default values
  return {
    speed: smoothSpeed,
    particleCount: getControlValue<number>("particleCount", 100),
    particleSize: getControlValue<number>("particleSize", 20),
    glowIntensity: normalizePercentage(
      getControlValue<number>("glowIntensity", 100),
    ),
    colorMode: comboboxValueToIndex(
      getControlValue<string | number>("colorMode", "Rainbow"),
      COLOR_MODES,
      9, // Default to Rainbow (index 9)
    ),
    flowDirection: comboboxValueToIndex(
      getControlValue<string | number>("flowDirection", "Outward"),
      FLOW_DIRECTIONS,
      0,
    ),
    connectParticles: Boolean(
      boolToInt(getControlValue<boolean | number>("connectParticles", 1)),
    ),
    particleBounce: Boolean(
      boolToInt(getControlValue<boolean | number>("particleBounce", 1)),
    ),
    colorSaturation:
      normalizePercentage(
        getControlValue<number>("colorSaturation", 100),
        100,
        0,
      ) * 100,
    colorIntensity:
      normalizePercentage(
        getControlValue<number>("colorIntensity", 100),
        100,
        0,
      ) * 100,
    connectorGlow:
      normalizePercentage(
        getControlValue<number>("connectorGlow", 100),
        100,
        0,
      ) * 100,
  };
}

/**
 * Initialize default global control values for SignalRGB
 */
export function initializeGlowParticlesControls(): void {
  // Set default values to make them available globally for SignalRGB
  window.speed = 3;
  window.particleCount = 100;
  window.particleSize = 20;
  window.glowIntensity = 100;
  window.colorMode = "Rainbow";
  window.flowDirection = "Outward";
  window.connectParticles = 1;
  window.particleBounce = 1;
  window.colorSaturation = 100;
  window.colorIntensity = 100;
  window.connectorGlow = 100;
}
