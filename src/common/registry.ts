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
    marginBottom: "8px",
    padding: "6px",
    borderRadius: "3px",
    backgroundColor: "rgba(20, 20, 35, 0.6)",
    border: "1px solid rgba(255, 113, 206, 0.15)",
    transition: "box-shadow 0.2s ease",
    position: "relative",
  },
  label: {
    display: "block",
    marginBottom: "2px",
    color: "#b967ff",
    fontWeight: "bold",
    fontSize: "12px",
    letterSpacing: "0.5px",
  },
  value: {
    color: "#05ffa1",
    fontFamily: "monospace",
    marginLeft: "6px",
    fontSize: "11px",
    textShadow: "0 0 3px rgba(5, 255, 161, 0.5)",
  },
  slider: {
    width: "100%",
    height: "16px",
    marginTop: "2px",
    accentColor: "#01cdfe",
    cursor: "pointer",
  },
  checkbox: {
    marginLeft: "0",
    accentColor: "#ff71ce",
  },
  select: {
    width: "100%",
    padding: "3px",
    backgroundColor: "rgba(12, 12, 30, 0.7)",
    color: "#05ffa1",
    border: "1px solid #01cdfe",
    borderRadius: "3px",
    fontSize: "12px",
    boxShadow: "0 0 3px rgba(1, 205, 254, 0.3)",
    outline: "none",
  },
  colorPicker: {
    width: "100%",
    height: "30px",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    backgroundColor: "transparent",
  },
  textField: {
    width: "100%",
    padding: "4px",
    backgroundColor: "rgba(12, 12, 30, 0.7)",
    color: "#05ffa1",
    border: "1px solid #01cdfe",
    borderRadius: "3px",
    fontSize: "12px",
    boxShadow: "0 0 3px rgba(1, 205, 254, 0.3)",
    outline: "none",
  },
  huePicker: {
    width: "100%",
    height: "16px",
    marginTop: "2px",
    backgroundImage:
      "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
    borderRadius: "3px",
    cursor: "pointer",
    position: "relative",
  },
  hueThumb: {
    width: "10px",
    height: "20px",
    borderRadius: "3px",
    backgroundColor: "#ffffff",
    border: "1px solid rgba(0, 0, 0, 0.3)",
    position: "absolute",
    top: "-2px",
    transform: "translateX(-5px)",
    boxShadow: "0 0 3px rgba(0, 0, 0, 0.5)",
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

      // Add hover effect for controls
      controlElement.addEventListener("mouseover", () => {
        controlElement.style.boxShadow = "0 0 8px rgba(1, 205, 254, 0.4)";
      });

      controlElement.addEventListener("mouseout", () => {
        controlElement.style.boxShadow = "none";
      });

      container.appendChild(controlElement);
    } catch (error) {
      debug(`Error creating control element for ${def.id}:`, error);

      // Add an error placeholder
      const errorEl = document.createElement("div");
      errorEl.textContent = `Error in ${def.id}: ${error}`;
      errorEl.style.color = "#ff71ce";
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

    case "hue":
      createHueControl(container, def, initialValue, onChange);
      break;

    case "color":
      createColorControl(container, def, initialValue, onChange);
      break;

    case "textfield":
      createTextFieldControl(container, def, initialValue, onChange);
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
  const min = (def as any).min ?? 0;
  const max = (def as any).max ?? 100;
  const step = (def as any).step ?? 1;

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
  slider.dataset.controlId = def.id;
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
  checkbox.dataset.controlId = def.id;
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
  const values = ((def as any).values as string[]) || [];

  // Create select element
  const select = document.createElement("select");
  select.dataset.controlId = def.id;
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

/**
 * Create a hue control (specialized color slider)
 */
function createHueControl(
  container: HTMLElement,
  def: ControlDefinition,
  initialValue: unknown,
  onChange: (id: string, value: unknown) => void,
): void {
  // Safe access to properties using type assertion
  const min = ((def as any).min as number) ?? 0;
  const max = ((def as any).max as number) ?? 360;

  // Normalize initial value
  const hueValue = Number(initialValue) || 0;

  // Create value display
  const valueDisplay = document.createElement("span");
  valueDisplay.textContent = String(hueValue);
  valueDisplay.classList.add("control-value");
  Object.assign(valueDisplay.style, defaultStyles.value);
  container.querySelector("label")?.appendChild(valueDisplay);

  // Create hue slider control
  const hueSlider = document.createElement("div");
  Object.assign(hueSlider.style, defaultStyles.huePicker);
  container.appendChild(hueSlider);

  // Create thumb element
  const thumb = document.createElement("div");
  Object.assign(thumb.style, defaultStyles.hueThumb);
  hueSlider.appendChild(thumb);

  // Position thumb initially
  const percent = ((hueValue - min) / (max - min)) * 100;
  thumb.style.left = `${percent}%`;

  // Update thumb color to match hue
  thumb.style.backgroundColor = `hsl(${hueValue}, 100%, 50%)`;

  // Create hidden slider for keyboard accessibility
  const hiddenSlider = document.createElement("input");
  hiddenSlider.type = "range";
  hiddenSlider.min = String(min);
  hiddenSlider.max = String(max);
  hiddenSlider.step = "1";
  hiddenSlider.value = String(hueValue);
  hiddenSlider.style.width = "100%";
  hiddenSlider.style.height = "0";
  hiddenSlider.style.visibility = "hidden";
  hiddenSlider.style.position = "absolute";
  hiddenSlider.style.top = "0";
  hiddenSlider.style.left = "0";
  container.appendChild(hiddenSlider);

  // Set up event listener for mouse/touch interactions
  function updateHue(clientX: number) {
    const rect = hueSlider.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    // Clamp percent to 0-1 range
    percent = Math.max(0, Math.min(1, percent));

    const value = Math.round(min + percent * (max - min));

    // Update thumb position and color
    thumb.style.left = `${percent * 100}%`;
    thumb.style.backgroundColor = `hsl(${value}, 100%, 50%)`;

    // Update value display
    valueDisplay.textContent = String(value);

    // Update hidden slider
    hiddenSlider.value = String(value);

    // Notify of change
    onChange(def.id, value);
  }

  hueSlider.addEventListener("mousedown", (event) => {
    updateHue(event.clientX);

    const onMouseMove = (e: MouseEvent) => {
      updateHue(e.clientX);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // Handle keyboard accessibility through hidden slider
  hiddenSlider.addEventListener("input", () => {
    const value = parseInt(hiddenSlider.value);
    const percent = (value - min) / (max - min);

    // Update thumb position and color
    thumb.style.left = `${percent * 100}%`;
    thumb.style.backgroundColor = `hsl(${value}, 100%, 50%)`;

    // Update value display
    valueDisplay.textContent = String(value);

    // Notify of change
    onChange(def.id, value);
  });
}

/**
 * Create a color picker control
 */
function createColorControl(
  container: HTMLElement,
  def: ControlDefinition,
  initialValue: unknown,
  onChange: (id: string, value: unknown) => void,
): void {
  // Create color picker
  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.value = String(initialValue) || "#ff0000";
  colorPicker.dataset.controlId = def.id;
  Object.assign(colorPicker.style, defaultStyles.colorPicker);
  container.appendChild(colorPicker);

  // Add value display
  const valueDisplay = document.createElement("span");
  valueDisplay.textContent = colorPicker.value;
  valueDisplay.classList.add("control-value");
  Object.assign(valueDisplay.style, defaultStyles.value);
  container.querySelector("label")?.appendChild(valueDisplay);

  // Set up event listener
  colorPicker.addEventListener("input", () => {
    valueDisplay.textContent = colorPicker.value;
    onChange(def.id, colorPicker.value);
  });
}

/**
 * Create a text field control
 */
function createTextFieldControl(
  container: HTMLElement,
  def: ControlDefinition,
  initialValue: unknown,
  onChange: (id: string, value: unknown) => void,
): void {
  // Create text input
  const textField = document.createElement("input");
  textField.type = "text";
  textField.value = String(initialValue) || "";
  textField.dataset.controlId = def.id;
  Object.assign(textField.style, defaultStyles.textField);
  container.appendChild(textField);

  // Set up event listeners
  textField.addEventListener("input", () => {
    onChange(def.id, textField.value);
  });

  // Handle enter key
  textField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      textField.blur();
    }
  });
}
