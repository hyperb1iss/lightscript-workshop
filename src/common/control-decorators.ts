/**
 * Decorator-based control definition system for SignalRGB effects
 * Provides type-safe decorators for defining controls directly in TypeScript classes
 */

import "reflect-metadata";
import { ControlDefinitionType } from "./definitions";

/**
 * Metadata keys for our reflection system
 */
export const METADATA_KEYS = {
  controls: Symbol.for("lightscript:controls"),
  effect: Symbol.for("lightscript:effect"),
};

// Property-specific metadata key generator
const propertyMetadataKey = (propertyName: string) =>
  Symbol.for(`lightscript:control:${propertyName}`);

/**
 * Base interface for control decorator options
 */
export interface ControlDecoratorOptions {
  label: string;
  tooltip?: string;
}

/**
 * Options for number control decorators (sliders)
 */
export interface NumberControlOptions extends ControlDecoratorOptions {
  min: number;
  max: number;
  default: number;
  step?: number;
}

/**
 * Options for boolean control decorators (checkboxes)
 */
export interface BooleanControlOptions extends ControlDecoratorOptions {
  default: boolean;
}

/**
 * Options for combobox control decorators (dropdowns)
 */
export interface ComboboxControlOptions extends ControlDecoratorOptions {
  values: string[];
  default: string;
}

/**
 * Options for hue control decorators (color wheel)
 */
export interface HueControlOptions extends ControlDecoratorOptions {
  min: number;
  max: number;
  default: number;
}

/**
 * Options for color control decorators (color picker)
 */
export interface ColorControlOptions extends ControlDecoratorOptions {
  default: string;
}

/**
 * Options for text field control decorators
 */
export interface TextFieldControlOptions extends ControlDecoratorOptions {
  default: string;
}

/**
 * Creates a control decorator factory
 * @param createDefinition Function to create the control definition
 * @returns A property decorator factory
 */
function createControlDecorator<T extends ControlDecoratorOptions>(
  createDefinition: (propertyKey: string, options: T) => ControlDefinitionType,
) {
  return function (options: T): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
      if (typeof propertyKey !== "string") {
        throw new Error(
          "Control decorators can only be used on string properties",
        );
      }

      // Get or create the controls metadata array on the class prototype
      const constructor = target.constructor;
      if (!Reflect.hasMetadata(METADATA_KEYS.controls, constructor)) {
        Reflect.defineMetadata(METADATA_KEYS.controls, [], constructor);
      }
      const controlsMetadata = Reflect.getMetadata(
        METADATA_KEYS.controls,
        constructor,
      );

      // Create and store the control definition
      const controlDefinition = createDefinition(propertyKey, options);
      controlsMetadata.push(controlDefinition);

      // Store the control definition for this specific property with a unique symbol
      Reflect.defineMetadata(
        propertyMetadataKey(propertyKey),
        controlDefinition,
        constructor,
      );
    };
  };
}

/**
 * Decorator for number controls
 *
 * @example
 * ```
 * @NumberControl({
 *   label: "Animation Speed",
 *   min: 1,
 *   max: 10,
 *   default: 5,
 *   tooltip: "Controls the speed of animation"
 * })
 * speed: number;
 * ```
 */
export const NumberControl = createControlDecorator<NumberControlOptions>(
  (propertyKey, options) => ({
    id: propertyKey,
    type: "number",
    label: options.label,
    min: options.min,
    max: options.max,
    default: options.default,
    step: options.step,
    tooltip: options.tooltip,
  }),
);

/**
 * Decorator for boolean controls
 *
 * @example
 * ```
 * @BooleanControl({
 *   label: "Enable Glow",
 *   default: true,
 *   tooltip: "Toggles the glow effect"
 * })
 * enableGlow: boolean;
 * ```
 */
export const BooleanControl = createControlDecorator<BooleanControlOptions>(
  (propertyKey, options) => ({
    id: propertyKey,
    type: "boolean",
    label: options.label,
    default: options.default,
    tooltip: options.tooltip,
  }),
);

/**
 * Decorator for combobox (dropdown) controls
 *
 * @example
 * ```
 * @ComboboxControl({
 *   label: "Effect Style",
 *   values: ["Smooth", "Pulsating", "Wave"],
 *   default: "Smooth",
 *   tooltip: "Select the visual style of the effect"
 * })
 * effectStyle: string;
 * ```
 */
export const ComboboxControl = createControlDecorator<ComboboxControlOptions>(
  (propertyKey, options) => ({
    id: propertyKey,
    type: "combobox",
    label: options.label,
    values: options.values,
    default: options.default,
    tooltip: options.tooltip,
  }),
);

/**
 * Decorator for hue controls
 *
 * @example
 * ```
 * @HueControl({
 *   label: "Base Color",
 *   min: 0,
 *   max: 360,
 *   default: 180,
 *   tooltip: "Choose the base hue for the effect"
 * })
 * baseHue: number;
 * ```
 */
export const HueControl = createControlDecorator<HueControlOptions>(
  (propertyKey, options) => ({
    id: propertyKey,
    type: "hue",
    label: options.label,
    min: options.min,
    max: options.max,
    default: options.default,
    tooltip: options.tooltip,
  }),
);

/**
 * Decorator for color picker controls
 *
 * @example
 * ```
 * @ColorControl({
 *   label: "Primary Color",
 *   default: "#ff00ff",
 *   tooltip: "Choose the primary color"
 * })
 * primaryColor: string;
 * ```
 */
export const ColorControl = createControlDecorator<ColorControlOptions>(
  (propertyKey, options) => ({
    id: propertyKey,
    type: "color",
    label: options.label,
    default: options.default,
    tooltip: options.tooltip,
  }),
);

/**
 * Decorator for text field controls
 *
 * @example
 * ```
 * @TextFieldControl({
 *   label: "Custom Text",
 *   default: "Hello World",
 *   tooltip: "Enter custom text to display"
 * })
 * customText: string;
 * ```
 */
export const TextFieldControl = createControlDecorator<TextFieldControlOptions>(
  (propertyKey, options) => ({
    id: propertyKey,
    type: "textfield",
    label: options.label,
    default: options.default,
    tooltip: options.tooltip,
  }),
);

/**
 * Class decorator to mark a class as an effect with metadata
 */
export interface EffectOptions {
  name: string;
  description: string;
  author: string;
}

/**
 * Decorator for effect classes
 *
 * @example
 * ``` * @Effect({
 *   name: "My Awesome Effect",
 *   description: "A colorful particle system with glowing effects",
 *   author: "hyperb1iss"
 * })
 * export class MyAwesomeEffect extends CanvasEffect<MyAwesomeControls> {
 *   // Implementation
 * }
 * ```
 */
export function Effect(options: EffectOptions): ClassDecorator {
  return function (target: Function) {
    // Store effect metadata using reflection
    Reflect.defineMetadata(METADATA_KEYS.effect, options, target.prototype);

    // Also store on the prototype for easier access
    target.prototype.effectMetadata = options;
  };
}

/**
 * Extract control definitions from a decorated class
 * @param targetClass The class to extract controls from
 * @returns Array of control definitions
 */
export function extractControlsFromClass(
  targetClass: any,
): ControlDefinitionType[] {
  const constructor =
    typeof targetClass === "function" ? targetClass : targetClass.constructor;

  // Use Reflect to get the metadata array
  if (Reflect.hasMetadata(METADATA_KEYS.controls, constructor)) {
    return Reflect.getMetadata(METADATA_KEYS.controls, constructor);
  }

  // Return empty array if nothing found
  return [];
}

/**
 * Extract effect metadata from a decorated class
 * @param targetClass The class to extract metadata from
 * @returns The effect metadata or default values
 */
export function extractEffectMetadata(targetClass: any): EffectOptions {
  // Default values if no metadata is found
  const defaultMetadata = {
    name: "Unnamed Effect",
    description: "",
    author: "",
  };

  // Get proper prototype
  const prototype =
    typeof targetClass === "function"
      ? targetClass.prototype
      : Object.getPrototypeOf(targetClass);

  // Try to get metadata from prototype
  if (Reflect.hasMetadata(METADATA_KEYS.effect, prototype)) {
    return Reflect.getMetadata(METADATA_KEYS.effect, prototype);
  }

  // Check for effectMetadata property directly
  if (prototype.effectMetadata) {
    return prototype.effectMetadata;
  }

  // Return default values
  return defaultMetadata;
}

/**
 * Get a specific control definition for a property
 * @param targetClass The class to extract control from
 * @param propertyName The property name to get control for
 */
export function getControlForProperty(
  targetClass: any,
  propertyName: string,
): ControlDefinitionType | undefined {
  return Reflect.getMetadata(propertyMetadataKey(propertyName), targetClass);
}
