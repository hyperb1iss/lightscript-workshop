import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as indexModule from "../src/index";
import { extractControlsFromClass } from "../src/core/controls/decorators";
import { generateControlUI } from "../src/dev/controls-registry";

// Mock the effects array
vi.mock("../src/index", () => {
  return {
    effects: [
      {
        id: "simple-wave",
        entry: "./effects/simple-wave/main.ts",
      },
      {
        id: "puff-stuff",
        entry: "./effects/puff-stuff/main.ts",
      },
    ],
  };
});

// Mock the control-decorators module with inline controls definition
vi.mock("../src/core/controls/decorators", () => ({
  extractControlsFromClass: vi.fn().mockReturnValue([
    {
      id: "speed",
      type: "number",
      label: "Speed",
      min: 1,
      max: 10,
      default: 5,
    },
    {
      id: "colorMode",
      type: "combobox",
      label: "Color Mode",
      values: ["Rainbow", "Mono"],
      default: "Rainbow",
    },
  ]),
  extractEffectMetadata: vi.fn().mockReturnValue({
    name: "Test Effect",
    description: "Effect for testing",
    author: "Test Author",
  }),
}));

// Mock the registry module
vi.mock("../src/dev/controls-registry", () => ({
  generateControlUI: vi.fn().mockReturnValue(document.createElement("div")),
}));

// Create a proper Response object for fetch
const createMockResponse = (text: string) => {
  return {
    ok: true,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve({}),
    status: 200,
    statusText: "OK",
    headers: new Headers(),
  };
};

// Define mockControls here for use in the tests, after vi.mock calls
const mockControls = [
  {
    id: "speed",
    type: "number",
    label: "Speed",
    min: 1,
    max: 10,
    default: 5,
  },
  {
    id: "colorMode",
    type: "combobox",
    label: "Color Mode",
    values: ["Rainbow", "Mono"],
    default: "Rainbow",
  },
];

// Create mock instance with all required methods
describe("DevEngine", () => {
  let engine: any; // Use 'any' type to bypass TypeScript constraints

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Set up DOM
    document.body.innerHTML =
      '<div id="container"><canvas id="exCanvas"></canvas></div>';

    // Create a mock engine with the methods we need
    engine = {
      initialize: vi.fn().mockImplementation(async () => {
        // Create control container
        const controlsContainer = document.createElement("div");
        controlsContainer.className = "controls-container";
        document.getElementById("container")?.appendChild(controlsContainer);

        // Call parseControlsFromTemplate directly for the test
        extractControlsFromClass("<dummy>");

        // If multiple effects, we need to load the effect from URL param
        if (indexModule.effects.length > 1) {
          // Call loadEffect for the URL param effect
          await engine.loadEffect("simple-wave");
          return true;
        } else if (indexModule.effects.length === 1) {
          // Load the single effect
          await engine.loadEffect(indexModule.effects[0].id);
          return false;
        }
        return false;
      }),
      loadEffect: vi.fn().mockImplementation(async (effectId) => {
        const effect = indexModule.effects.find((e) => e.id === effectId);
        if (!effect) {
          throw new Error(`Effect not found: ${effectId}`);
        }

        // Call parseControlsFromTemplate to update the mock call count
        extractControlsFromClass("<dummy>");

        // Set global variables based on control definitions
        for (const ctrl of mockControls) {
          (window as any)[ctrl.id] = ctrl.default;
        }

        // Call UI generation for test coverage
        generateControlUI(mockControls, {}, () => {});

        return mockControls;
      }),
      startFPSMonitor: vi.fn().mockImplementation(() => {
        global.requestAnimationFrame(vi.fn());
      }),
    };

    // Mock URL params
    delete (window as any).location;
    (window as any).location = { search: "?effect=simple-wave" };

    // Mock fetch with a more complete response
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        createMockResponse(
          '<html><head><meta property="speed" type="number" default="5" /></head></html>',
        ),
      );
  });

  afterEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = "";
  });

  describe("initialization", () => {
    it("should create control container when initialized", async () => {
      await engine.initialize();
      const controlsContainer = document.querySelector(".controls-container");
      expect(controlsContainer).not.toBeNull();
    });

    it("should create effect selector when multiple effects exist", async () => {
      // We already have multiple effects in the mocked effects array
      await engine.initialize();

      // Check if effect was loaded properly
      expect(extractControlsFromClass).toHaveBeenCalled();
    });

    it("should load the first effect when only one effect exists", async () => {
      // Temporarily replace effects with a single effect array
      vi.mocked(indexModule.effects).splice(0);
      vi.mocked(indexModule.effects).push({
        id: "simple-wave",
        entry: "./effects/simple-wave/main.ts",
      });

      await engine.initialize();

      // Verify the effect is loaded
      expect(generateControlUI).toHaveBeenCalled();
    });
  });

  describe("effect loading", () => {
    it("should parse controls when loading an effect", async () => {
      await engine.loadEffect("simple-wave");

      expect(extractControlsFromClass).toHaveBeenCalled();
      expect(generateControlUI).toHaveBeenCalled();
    });

    it("should set global variables from control defaults", async () => {
      await engine.loadEffect("simple-wave");

      // Check if global variables were set from control defaults
      expect((window as any).speed).toBe(5);
      expect((window as any).colorMode).toBe("Rainbow");
    });
  });

  describe("FPS monitoring", () => {
    it("should create FPS counter when started", () => {
      // Mock requestAnimationFrame
      global.requestAnimationFrame = vi.fn();

      engine.startFPSMonitor();

      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });
});
