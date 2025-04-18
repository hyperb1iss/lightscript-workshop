/**
 * Control system type definitions
 * Defines interfaces for effect controls
 */

/**
 * Base interface for all control definitions
 */
export interface ControlDefinition {
  id: string; // Control identifier (from property/name attribute)
  type: string; // Control type (number, boolean, combobox, etc.)
  label: string; // Display label
  default: unknown; // Default value
  tooltip?: string; // Optional tooltip
  [key: string]: unknown; // Additional type-specific properties
}

/**
 * Definition for number-based controls
 */
export interface NumberControlDefinition extends ControlDefinition {
  type: "number";
  min: number;
  max: number;
  default: number;
  step?: number;
}

/**
 * Definition for boolean controls (checkboxes, toggles)
 */
export interface BooleanControlDefinition extends ControlDefinition {
  type: "boolean";
  default: boolean | number; // Support both boolean and 0/1
}

/**
 * Definition for dropdown/combobox controls
 */
export interface ComboboxControlDefinition extends ControlDefinition {
  type: "combobox";
  values: string[]; // Array of options
  default: string; // Default value (option text)
}

/**
 * Definition for hue picker controls
 */
export interface HueControlDefinition extends ControlDefinition {
  type: "hue";
  min: number;
  max: number;
  default: number;
}

/**
 * Definition for color picker controls
 */
export interface ColorControlDefinition extends ControlDefinition {
  type: "color";
  default: string; // Hex color value
}

/**
 * Definition for text field controls
 */
export interface TextFieldControlDefinition extends ControlDefinition {
  type: "textfield";
  default: string;
}

/**
 * Union type of all control definition types
 */
export type ControlDefinitionType =
  | NumberControlDefinition
  | BooleanControlDefinition
  | ComboboxControlDefinition
  | HueControlDefinition
  | ColorControlDefinition
  | TextFieldControlDefinition;

/**
 * Represents the runtime values for all controls in an effect
 */
export interface ControlValues {
  [key: string]: unknown;
}

/**
 * Base interface that all effect control interfaces should extend
 */
export interface BaseControls {
  [key: string]: unknown;
}
