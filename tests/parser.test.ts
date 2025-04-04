import { describe, it, expect } from "vitest";
import {
  extractControlsFromClass,
  extractEffectMetadata,
  Effect,
  NumberControl,
  BooleanControl,
  ComboboxControl,
} from "../src/core/controls/decorators";
import { ControlDefinition } from "../src/core/controls/definitions";

// Note: We're testing the decorator API directly
describe("control-decorators", () => {
  describe("extractControlsFromClass", () => {
    it("should extract control definitions from decorated class properties", () => {
      // Create a test class with decorators
      @Effect({
        name: "Test Effect",
        description: "Effect for testing",
        author: "Test Author",
      })
      class TestEffect {
        @NumberControl({
          label: "Speed",
          min: 1,
          max: 10,
          default: 5,
          tooltip: "Controls speed",
        })
        speed!: number;

        @BooleanControl({
          label: "Toggle Feature",
          default: true,
          tooltip: "Enables a feature",
        })
        enabled!: boolean;

        @ComboboxControl({
          label: "Color Mode",
          values: ["Red", "Green", "Blue"],
          default: "Red",
          tooltip: "Select color mode",
        })
        colorMode!: string;
      }

      // Extract controls
      const controls = extractControlsFromClass(TestEffect);

      // Validate results
      expect(controls).toHaveLength(3);

      // Find specific controls
      const speedControl = controls.find(
        (c: ControlDefinition) => c.id === "speed",
      );
      const enabledControl = controls.find(
        (c: ControlDefinition) => c.id === "enabled",
      );
      const colorModeControl = controls.find(
        (c: ControlDefinition) => c.id === "colorMode",
      );

      // Verify individual controls
      expect(speedControl).toMatchObject({
        id: "speed",
        type: "number",
        label: "Speed",
        min: 1,
        max: 10,
        default: 5,
        tooltip: "Controls speed",
      });

      expect(enabledControl).toMatchObject({
        id: "enabled",
        type: "boolean",
        label: "Toggle Feature",
        default: true,
        tooltip: "Enables a feature",
      });

      expect(colorModeControl).toMatchObject({
        id: "colorMode",
        type: "combobox",
        label: "Color Mode",
        values: ["Red", "Green", "Blue"],
        default: "Red",
        tooltip: "Select color mode",
      });
    });
  });

  describe("extractEffectMetadata", () => {
    it("should extract metadata from class decorator", () => {
      // Create a test class with Effect decorator
      @Effect({
        name: "Cool Effect",
        description: "A cool effect",
        author: "Cool Author",
      })
      class CoolEffect {}

      // Extract metadata
      const metadata = extractEffectMetadata(CoolEffect);

      // Verify metadata
      expect(metadata).toMatchObject({
        name: "Cool Effect",
        description: "A cool effect",
        author: "Cool Author",
      });
    });

    it("should return default values if no metadata found", () => {
      // Class without decorator
      class PlainClass {}

      // Extract metadata
      const metadata = extractEffectMetadata(PlainClass);

      // Verify default metadata
      expect(metadata).toMatchObject({
        name: "Unnamed Effect",
        description: "",
        author: "",
      });
    });
  });
});
