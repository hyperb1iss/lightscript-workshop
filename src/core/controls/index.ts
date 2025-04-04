/**
 * Control system index
 * Re-exports all control system components for easier imports
 */

// Re-export decorators
export * from "./decorators";

// Re-export definitions
export * from "./definitions";

// Re-export helpers but with type
export {
  getControlValue,
  normalizeSpeed,
  comboboxValueToIndex,
  normalizePercentage,
  boolToInt,
  getAllControls,
} from "./helpers";

// Re-export the BaseControls from helpers with a different name to avoid conflict
export type { BaseControls as ControlBaseInterface } from "./helpers";
