/**
 * DevEngine - Development engine for SignalRGB effects
 * Manages effect loading, control state, and UI generation
 */

import { createDebugLogger } from "./debug";
import { ControlDefinition, ControlValues } from "./definitions";
import { parseControlsFromTemplate } from "./parser";
import { generateControlUI } from "./registry";
import { effects } from "../index";

const debug = createDebugLogger("DevEngine");

/**
 * DevEngine class for managing effects
 */
export class DevEngine {
  // Current effect data
  private currentEffect: (typeof effects)[0] | null = null;
  private controlDefinitions: ControlDefinition[] = [];
  private controlValues: ControlValues = {};

  // DOM elements
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private controlsContainer: HTMLElement | null = null;

  /**
   * Create a new DevEngine instance
   */
  constructor() {
    debug("DevEngine initialized");
  }

  /**
   * Initialize the development environment
   */
  public async initialize(container: HTMLElement): Promise<void> {
    this.container = container;

    // Create canvas reference
    this.canvas = document.getElementById("exCanvas") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element with ID "exCanvas" not found');
    }

    // Create controls container
    this.controlsContainer = document.createElement("div");
    this.controlsContainer.className = "controls-container";
    this.controlsContainer.style.position = "absolute";
    this.controlsContainer.style.top = "10px";
    this.controlsContainer.style.left = "10px";
    this.controlsContainer.style.maxWidth = "300px";
    this.controlsContainer.style.maxHeight = "80vh";
    this.controlsContainer.style.overflowY = "auto";
    this.controlsContainer.style.background = "rgba(0,0,0,0.7)";
    this.controlsContainer.style.padding = "15px";
    this.controlsContainer.style.borderRadius = "5px";
    this.controlsContainer.style.zIndex = "100";

    container.appendChild(this.controlsContainer);

    // Create effect selector if multiple effects are available
    if (effects.length > 1) {
      await this.createEffectSelector();
    } else if (effects.length === 1) {
      // Load the only available effect
      await this.loadEffect(effects[0].id);
    } else {
      throw new Error("No effects defined in index.ts");
    }
  }

  /**
   * Create a dropdown to select effects
   */
  private async createEffectSelector(): Promise<void> {
    const selectorContainer = document.createElement("div");
    selectorContainer.style.position = "absolute";
    selectorContainer.style.top = "10px";
    selectorContainer.style.right = "10px";
    selectorContainer.style.background = "rgba(0,0,0,0.7)";
    selectorContainer.style.padding = "15px";
    selectorContainer.style.borderRadius = "5px";
    selectorContainer.style.zIndex = "100";

    const label = document.createElement("label");
    label.textContent = "Select Effect: ";
    label.style.color = "#fff";
    selectorContainer.appendChild(label);

    const select = document.createElement("select");
    select.style.marginLeft = "10px";
    select.style.background = "#222";
    select.style.color = "#fff";
    select.style.border = "1px solid #444";
    select.style.padding = "5px";
    select.style.borderRadius = "4px";

    // Add options for each effect
    for (const effect of effects) {
      const option = document.createElement("option");
      option.value = effect.id;
      option.textContent = effect.name;
      select.appendChild(option);
    }

    // Set up change event
    select.addEventListener("change", () => {
      // Reload the page with the new effect ID to ensure clean state
      window.location.href = `?effect=${select.value}`;
    });

    selectorContainer.appendChild(select);
    this.container?.appendChild(selectorContainer);

    // Get the effect ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const effectId = urlParams.get("effect") || effects[0].id;

    // Set the selector to match the current effect
    select.value = effectId;

    // Load the first effect
    await this.loadEffect(effectId);
  }

  /**
   * Load an effect and its controls
   */
  public async loadEffect(effectId: string): Promise<void> {
    debug(`Loading effect: ${effectId}`);

    // Find the effect definition
    const effect = effects.find((e) => e.id === effectId);
    if (!effect) {
      throw new Error(`Effect not found: ${effectId}`);
    }

    this.currentEffect = effect;

    // Clear any global window variables from previous effects
    this.clearGlobalVariables();

    try {
      // In Vite, we can use a special import to get the template content
      const templatePath = effect.template.replace(/^\.\//, "/src/");

      // Parse the template for controls
      const templateResponse = await fetch(templatePath);
      if (!templateResponse.ok) {
        throw new Error(`Failed to load template from ${templatePath}`);
      }

      const templateHtml = await templateResponse.text();
      this.controlDefinitions = parseControlsFromTemplate(templateHtml);

      debug(
        `Loaded ${this.controlDefinitions.length} controls for ${effect.name}`,
      );

      // Initialize control values with defaults
      this.controlValues = {};
      for (const def of this.controlDefinitions) {
        this.controlValues[def.id] = def.default;

        // Set global variables for backwards compatibility
        window[def.id] = def.default;
      }

      // Generate UI
      this.generateControlUI();

      // Create a label for the current effect
      const effectLabel = document.createElement("div");
      effectLabel.style.position = "absolute";
      effectLabel.style.bottom = "10px";
      effectLabel.style.right = "10px";
      effectLabel.style.background = "rgba(0,0,0,0.7)";
      effectLabel.style.color = "#0f0";
      effectLabel.style.padding = "10px";
      effectLabel.style.borderRadius = "5px";
      effectLabel.textContent = `Active Effect: ${effect.name}`;

      // Remove any existing label
      const existingLabel = document.getElementById("current-effect-label");
      if (existingLabel) {
        existingLabel.remove();
      }

      effectLabel.id = "current-effect-label";
      this.container?.appendChild(effectLabel);
    } catch (error) {
      debug("Error loading effect:", error);
      throw error;
    }
  }

  /**
   * Generate UI elements for all controls
   */
  private generateControlUI(): void {
    if (!this.controlsContainer) return;

    // Clear existing controls
    this.controlsContainer.innerHTML = "";

    // Add effect name heading
    const heading = document.createElement("h2");
    heading.textContent = this.currentEffect?.name || "Effect Controls";
    heading.style.color = "#0f0";
    heading.style.margin = "0 0 15px 0";
    heading.style.fontFamily = "sans-serif";
    heading.style.fontSize = "18px";
    this.controlsContainer.appendChild(heading);

    // Generate controls
    const controlsElement = generateControlUI(
      this.controlDefinitions,
      this.controlValues,
      this.handleControlChange.bind(this),
    );

    this.controlsContainer.appendChild(controlsElement);

    // Add FPS counter
    const fpsCounter = document.createElement("div");
    fpsCounter.id = "fpsCounter";
    fpsCounter.textContent = "-- FPS";
    fpsCounter.style.marginTop = "20px";
    fpsCounter.style.textAlign = "center";
    fpsCounter.style.color = "#0f0";
    fpsCounter.style.fontFamily = "monospace";
    this.controlsContainer.appendChild(fpsCounter);
  }

  /**
   * Handle control value changes
   */
  private handleControlChange(id: string, value: unknown): void {
    debug(`Control changed: ${id} = ${value}`);

    // Update internal state
    this.controlValues[id] = value;

    // Update global variable for backward compatibility
    window[id] = value;

    // Try to call the global update function if it exists
    if (typeof window.update === "function") {
      window.update();
    }
  }

  /**
   * Clear global variables used by effects
   */
  private clearGlobalVariables(): void {
    if (this.controlDefinitions.length > 0) {
      for (const def of this.controlDefinitions) {
        delete window[def.id];
      }
    }
  }

  /**
   * Start monitoring FPS
   */
  public startFPSMonitor(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateFPS = () => {
      const now = performance.now();
      frameCount++;

      // Update every second
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        const fpsCounter = document.getElementById("fpsCounter");
        if (fpsCounter) {
          fpsCounter.textContent = `${fps} FPS`;
          fpsCounter.style.color =
            fps > 30 ? "#0f0" : fps > 15 ? "#ff0" : "#f00";
        }

        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }
}
