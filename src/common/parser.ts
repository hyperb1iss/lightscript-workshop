/**
 * Template parser for control definitions
 * Extracts control metadata from HTML templates
 */

import {
  ControlDefinition,
  NumberControlDefinition,
  BooleanControlDefinition,
  ComboboxControlDefinition,
} from "./definitions";

/**
 * Parse control definitions from an HTML template
 * @param template HTML template string
 * @returns Array of control definitions
 */
export function parseControlsFromTemplate(
  template: string,
): ControlDefinition[] {
  const controls: ControlDefinition[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(template, "text/html");

  // Get all meta tags with property or name attributes
  const metaTags = Array.from(
    doc.querySelectorAll("meta[property], meta[name]"),
  );

  for (const tag of metaTags) {
    const id = tag.getAttribute("property") || tag.getAttribute("name");
    if (!id) continue;

    // Skip standard meta tags
    if (
      ["charset", "viewport", "description", "keywords", "publisher"].includes(
        id,
      )
    ) {
      continue;
    }

    const type = tag.getAttribute("type") || "text";

    // Create control definition based on type
    let control: ControlDefinition;

    switch (type) {
      case "number":
        control = createNumberControl(id, tag);
        break;
      case "boolean":
        control = createBooleanControl(id, tag);
        break;
      case "combobox":
        control = createComboboxControl(id, tag);
        break;
      default:
        // Generic control as fallback
        control = {
          id,
          type,
          label: tag.getAttribute("label") || id,
          default: tag.getAttribute("default") || "",
          tooltip: tag.getAttribute("tooltip") || undefined,
        };
    }

    controls.push(control);
  }

  return controls;
}

/**
 * Create a number control definition from a meta tag
 */
function createNumberControl(
  id: string,
  tag: Element,
): NumberControlDefinition {
  return {
    id,
    type: "number",
    label: tag.getAttribute("label") || id,
    min: parseFloat(tag.getAttribute("min") || "0"),
    max: parseFloat(tag.getAttribute("max") || "100"),
    step: tag.getAttribute("step")
      ? parseFloat(tag.getAttribute("step")!)
      : undefined,
    default: parseFloat(tag.getAttribute("default") || "0"),
    tooltip: tag.getAttribute("tooltip") || undefined,
  };
}

/**
 * Create a boolean control definition from a meta tag
 */
function createBooleanControl(
  id: string,
  tag: Element,
): BooleanControlDefinition {
  const defaultValue = tag.getAttribute("default");

  return {
    id,
    type: "boolean",
    label: tag.getAttribute("label") || id,
    default: defaultValue === "1" || defaultValue === "true",
    tooltip: tag.getAttribute("tooltip") || undefined,
  };
}

/**
 * Create a combobox control definition from a meta tag
 */
function createComboboxControl(
  id: string,
  tag: Element,
): ComboboxControlDefinition {
  const valuesAttr = tag.getAttribute("values") || "";

  return {
    id,
    type: "combobox",
    label: tag.getAttribute("label") || id,
    values: valuesAttr.split(",").map((v) => v.trim()),
    default: tag.getAttribute("default") || "",
    tooltip: tag.getAttribute("tooltip") || undefined,
  };
}

/**
 * Load a template from a URL and parse the controls
 */
export async function loadAndParseTemplate(
  templateUrl: string,
): Promise<ControlDefinition[]> {
  try {
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to load template: ${response.status} ${response.statusText}`,
      );
    }
    const template = await response.text();
    return parseControlsFromTemplate(template);
  } catch (error) {
    console.error("Error loading template:", error);
    return [];
  }
}
