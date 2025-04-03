/**
 * Control registry and factory
 * Provides UI element generation and value conversion
 */

import { ControlDefinition, ControlValues } from "./definitions";
import { createDebugLogger } from "./debug";

const debug = createDebugLogger("ControlRegistry");

/**
 * Default styles for control elements
 */
const defaultStyles = {
  container: {
    marginBottom: "12px",
    padding: "8px",
    borderRadius: "4px",
    backgroundColor: "rgba(20, 20, 20, 0.6)",
  },
  label: {
    display: "block",
    marginBottom: "4px",
    color: "#ddd",
    fontWeight: "bold",
    fontSize: "14px",
  },
  value: {
    color: "#0f0",
    fontFamily: "monospace",
    marginLeft: "8px",
  },
  slider: {
    width: "100%",
    marginTop: "4px",
  },
  checkbox: {
    marginLeft: "0",
  },
  select: {
    width: "100%",
    padding: "4px",
    backgroundColor: "#222",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "4px",
  },
};

/**
 * Generate UI controls from control definitions
 */
export function generateControlUI(
  definitions: ControlDefinition[],
  initialValues: ControlValues,
  onChange: (id: string, value: unknown) => void,
): HTMLElement {
  const container = document.createElement("div");
  container.classList.add("controls-container");

  for (const def of definitions) {
    try {
      const controlElement = createControlElement(
        def,
        initialValues[def.id] ?? def.default,
        onChange,
      );
      container.appendChild(controlElement);
    } catch (error) {
      debug(`Error creating control element for ${def.id}:`, error);

      // Add an error placeholder
      const errorEl = document.createElement("div");
      errorEl.textContent = `Error in ${def.id}: ${error}`;
      errorEl.style.color = "red";
      container.appendChild(errorEl);
    }
  }

  return container;
}

/**
 * Create a UI element for a specific control
 */
function createControlElement(
  def: ControlDefinition,
  initialValue: unknown,
  onChange: (id: string, value: unknown) => void,
): HTMLElement {
  const container = document.createElement("div");
  Object.assign(container.style, defaultStyles.container);

  // Create label
  const label = document.createElement("label");
  label.textContent = def.label;
  Object.assign(label.style, defaultStyles.label);
  container.appendChild(label);

  // Add tooltip if available
  if (def.tooltip) {
    label.title = def.tooltip;
    label.style.cursor = "help";
  }

  // Create control based on type
  switch (def.type) {
    case "number":
      createNumberControl(container, def, initialValue, onChange);
      break;

    case "boolean":
      createBooleanControl(container, def, initialValue, onChange);
      break;

    case "combobox":
      createComboboxControl(container, def, initialValue, onChange);
      break;

    default:
      label.textContent += ` (Unsupported type: ${def.type})`;
  }

  return container;
}

/**
 * Create a number control (slider + value display)
 */
function createNumberControl(
  container: HTMLElement,
  def: ControlDefinition,
  initialValue: unknown,
  onChange: (id: string, value: unknown) => void,
): void {
  const min = def.min ?? 0;
  const max = def.max ?? 100;
  const step = def.step ?? 1;

  // Create value display
  const valueDisplay = document.createElement("span");
  valueDisplay.textContent = String(initialValue);
  valueDisplay.classList.add("control-value");
  Object.assign(valueDisplay.style, defaultStyles.value);
  container.querySelector("label")?.appendChild(valueDisplay);

  // Create slider
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(initialValue);
  Object.assign(slider.style, defaultStyles.slider);
  container.appendChild(slider);

  // Set up event listener
  slider.addEventListener("input", () => {
    const value = parseFloat(slider.value);
    valueDisplay.textContent = String(value);
    onChange(def.id, value);
  });
}

/**
 * Create a boolean control (checkbox)
 */
function createBooleanControl(
  container: HTMLElement,
  def: ControlDefinition,
  initialValue: unknown,
  onChange: (id: string, value: unknown) => void,
): void {
  // Normalize initial value
  const boolValue = initialValue === true || initialValue === 1;

  // Create checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = boolValue;
  Object.assign(checkbox.style, defaultStyles.checkbox);
  container.appendChild(checkbox);

  // Set up event listener
  checkbox.addEventListener("change", () => {
    onChange(def.id, checkbox.checked ? 1 : 0);
  });
}

/**
 * Create a combobox control (dropdown select)
 */
function createComboboxControl(
  container: HTMLElement,
  def: ControlDefinition,
  initialValue: unknown,
  onChange: (id: string, value: unknown) => void,
): void {
  const values = (def.values as string[]) || [];

  // Create select element
  const select = document.createElement("select");
  Object.assign(select.style, defaultStyles.select);

  // Add options
  for (const val of values) {
    const option = document.createElement("option");
    option.value = val;
    option.textContent = val;
    select.appendChild(option);
  }

  // Set initial value
  select.value = String(initialValue);

  container.appendChild(select);

  // Set up event listener
  select.addEventListener("change", () => {
    onChange(def.id, select.value);
  });
}
