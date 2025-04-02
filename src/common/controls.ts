/**
 * Common interfaces and utilities for SignalRGB controls
 */

/**
 * Base interface for all effect controls
 * Contains properties common to most lightscripts
 */
export interface BaseControls {
  speed: number;
  colorIntensity: number;
  colorSaturation: number;
}

/**
 * Interface for accessing control values from SignalRGB
 * @param propertyName - Name of the control property
 * @param defaultValue - Default value if property is undefined
 * @returns The control value from the window object
 */
export function getControlValue<T>(propertyName: string, defaultValue: T): T {
  return ((window as any)[propertyName] as T) ?? defaultValue;
}

/**
 * Normalizes a speed value from the SignalRGB range (1-10) to a multiplier
 * @param speed - Raw speed value from SignalRGB
 * @returns Normalized speed value (0.2-3.0)
 */
export function normalizeSpeed(speed: number): number {
  if (typeof speed !== "number" || isNaN(speed)) {
    return 1.0; // Default value
  }

  // Use a non-linear curve for better control at lower speeds
  return Math.max(0.2, Math.pow(speed / 5, 1.5));
}

/**
 * Converts a string value from a combobox to its numeric index
 * @param value - Current value (string or number)
 * @param options - Array of possible string values
 * @param defaultIndex - Default index if not found
 * @returns Numeric index of the value in the options array
 */
export function comboboxValueToIndex(
  value: string | number,
  options: string[],
  defaultIndex = 0,
): number {
  if (typeof value === "number") {
    return value;
  }

  const index = options.indexOf(value);
  return index === -1 ? defaultIndex : index;
}

/**
 * Normalizes a percentage value to a factor (0-2 range)
 * @param value - Raw percentage value (typically 0-200)
 * @param defaultValue - Default percentage to use if undefined (100 = 1.0)
 * @param minValue - Minimum allowed output value
 * @returns Normalized factor value
 */
export function normalizePercentage(
  value: number,
  defaultValue = 100,
  minValue = 0.01,
): number {
  const rawValue = typeof value === "number" ? value : defaultValue;
  return Math.max(minValue, rawValue / 100);
}

/**
 * Converts a boolean value from SignalRGB to a number (0 or 1)
 * @param value - Boolean value to convert
 * @returns 1 if true, 0 if false
 */
export function boolToInt(value: boolean | number): number {
  if (typeof value === "number") {
    return value === 0 ? 0 : 1;
  }
  return value ? 1 : 0;
}

/**
 * Fetches all control values from the window object
 * @param controls - Dictionary of control names and default values
 * @returns Object with all control values
 */
export function getAllControls<T extends Record<string, any>>(controls: T): T {
  const result: Record<string, any> = {};

  for (const [key, defaultValue] of Object.entries(controls)) {
    result[key] = getControlValue(key, defaultValue);
  }

  return result as T;
}
