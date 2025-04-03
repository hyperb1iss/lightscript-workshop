import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseControlsFromTemplate } from "../src/common/parser";

describe("template parser", () => {
  // Mock DOMParser before tests
  let mockParsedHTML: Document;

  beforeEach(() => {
    // Create a real HTML document
    mockParsedHTML = document.implementation.createHTMLDocument();

    // Mock the DOMParser
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn().mockReturnValue(mockParsedHTML),
    }));
  });

  describe("parseControlsFromTemplate", () => {
    it("should extract number controls", () => {
      // Set up the HTML with a number control
      mockParsedHTML.head.innerHTML = `
        <meta property="speed" 
              label="Animation Speed" 
              type="number" 
              min="1" 
              max="10" 
              step="0.5"
              default="5" 
              tooltip="Controls speed" />
      `;

      const controls = parseControlsFromTemplate("dummy-template");

      expect(controls).toHaveLength(1);
      expect(controls[0]).toMatchObject({
        id: "speed",
        type: "number",
        label: "Animation Speed",
        min: 1,
        max: 10,
        step: 0.5,
        default: 5,
        tooltip: "Controls speed",
      });
    });

    it("should extract boolean controls", () => {
      // Set up the HTML with a boolean control
      mockParsedHTML.head.innerHTML = `
        <meta property="colorShift" 
              label="Color Shift" 
              type="boolean" 
              default="1" 
              tooltip="Toggles color shifting" />
      `;

      const controls = parseControlsFromTemplate("dummy-template");

      expect(controls).toHaveLength(1);
      expect(controls[0]).toMatchObject({
        id: "colorShift",
        type: "boolean",
        label: "Color Shift",
        default: true,
        tooltip: "Toggles color shifting",
      });
    });

    it("should extract combobox controls", () => {
      // Set up the HTML with a combobox control
      mockParsedHTML.head.innerHTML = `
        <meta property="colorScheme" 
              label="Color Scheme" 
              type="combobox" 
              values="Blue,Red,Green" 
              default="Blue" 
              tooltip="Select color scheme" />
      `;

      const controls = parseControlsFromTemplate("dummy-template");

      expect(controls).toHaveLength(1);
      expect(controls[0]).toMatchObject({
        id: "colorScheme",
        type: "combobox",
        label: "Color Scheme",
        values: ["Blue", "Red", "Green"],
        default: "Blue",
        tooltip: "Select color scheme",
      });
    });

    it("should ignore standard meta tags", () => {
      // Set up the HTML with standard meta tags and a control
      mockParsedHTML.head.innerHTML = `
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <meta name="description" content="Test description" />
        <meta property="testControl" label="Test" type="number" default="1" />
      `;

      const controls = parseControlsFromTemplate("dummy-template");

      expect(controls).toHaveLength(1);
      expect(controls[0].id).toBe("testControl");
    });

    it("should handle meta tags with name attribute instead of property", () => {
      // Set up the HTML with a control using name attribute
      mockParsedHTML.head.innerHTML = `
        <meta name="testControl" 
              label="Test Control" 
              type="number" 
              default="1" />
      `;

      const controls = parseControlsFromTemplate("dummy-template");

      expect(controls).toHaveLength(1);
      expect(controls[0].id).toBe("testControl");
    });

    it("should handle a mix of different control types", () => {
      // Set up the HTML with multiple control types
      mockParsedHTML.head.innerHTML = `
        <meta property="speed" type="number" default="5" />
        <meta property="enabled" type="boolean" default="true" />
        <meta property="style" type="combobox" values="A,B,C" default="A" />
        <meta property="custom" type="custom" default="value" />
      `;

      const controls = parseControlsFromTemplate("dummy-template");

      expect(controls).toHaveLength(4);
      expect(controls.map((c) => c.type)).toEqual([
        "number",
        "boolean",
        "combobox",
        "custom",
      ]);
    });
  });
});
