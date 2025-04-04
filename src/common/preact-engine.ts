/**
 * PreactDevEngine - Development engine for SignalRGB effects using Preact components
 * Manages effect loading, control state, and UI generation with a component-based architecture
 */

import { h, render } from "preact";
import { createDebugLogger, printStartupBanner } from "./debug";
import { ControlDefinition, ControlValues } from "./definitions";
import { parseControlsFromTemplate } from "./parser";
import { effects } from "../index";
import { App } from "../ui/App";

const debug = createDebugLogger("PreactDevEngine");

/**
 * PreactDevEngine class for managing effects with Preact UI components
 */
export class PreactDevEngine {
  // Current effect data
  private currentEffect: (typeof effects)[0] | null = null;
  private controlDefinitions: ControlDefinition[] = [];
  private controlValues: ControlValues = {};

  // DOM elements
  private canvas: HTMLCanvasElement | null = null;
  private fpsValue = 0;
  private frameCount = 0;
  private lastTime = 0;

  // Root element for Preact rendering
  private rootElement: HTMLElement | null = null;

  private isLoading: boolean = true;

  /**
   * Create a new PreactDevEngine instance
   */
  constructor() {
    debug("info", "Initializing lighting engine");

    // Create root element for Preact
    this.rootElement = document.createElement("div");
    this.rootElement.id = "preact-root";
    this.rootElement.className = "dev-engine-container"; // Use the same class name as expected by the components
    document.body.appendChild(this.rootElement);

    this.renderUI();

    // Hide the loader after a delay
    setTimeout(() => {
      this.isLoading = false;
      this.renderUI();
    }, 1500);
  }

  /**
   * Initialize the development environment
   */
  public async initialize(): Promise<void> {
    // Display startup banner
    printStartupBanner();

    // Create canvas reference
    this.canvas = document.getElementById("exCanvas") as HTMLCanvasElement;
    if (!this.canvas) {
      debug("error", 'Canvas element with ID "exCanvas" not found');
      throw new Error('Canvas element with ID "exCanvas" not found');
    }

    // Get the effect ID from URL or use the first effect
    const urlParams = new URLSearchParams(window.location.search);
    const effectId = urlParams.get("effect") || effects[0].id;

    // Load the effect
    await this.loadEffect(effectId);

    // Add window resize listener to handle responsive layout
    window.addEventListener("resize", this.handleResize.bind(this));
    this.handleResize();

    // Start FPS monitor
    this.startFPSMonitor();

    debug("success", "Engine initialized and ready");
  }

  /**
   * Show a notification
   * This method delegates to the global window.showNotification function
   */
  public showNotification(message: string, isError: boolean = false): void {
    if (typeof window.showNotification === "function") {
      window.showNotification(message, isError);
    } else {
      debug(isError ? "error" : "info", `Notification: ${message}`);
    }
  }

  /**
   * Render the Preact UI components
   */
  private renderUI(): void {
    if (!this.rootElement) return;

    debug("debug", "Rendering UI components", {
      effectsCount: effects.length,
      currentEffect: this.currentEffect?.id,
      controlsCount: this.controlDefinitions.length,
    });

    render(
      h(App, {
        effects: effects,
        currentEffectId: this.currentEffect?.id || "",
        fps: this.fpsValue,
        controlDefinitions: this.controlDefinitions,
        controlValues: this.controlValues,
        isLoading: this.isLoading,
        onEffectChange: (id: string) => this.loadEffect(id),
        onControlChange: (id: string, value: unknown) =>
          this.handleControlChange(id, value),
        onResetControls: () => this.resetControls(),
        onTakeScreenshot: () => this.takeScreenshot(),
      }),
      this.rootElement,
    );
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    if (this.canvas) {
      // Make canvas responsive within container
      const canvasContainer = this.canvas.parentElement;
      if (canvasContainer) {
        const maxWidth = Math.min(window.innerWidth - 40, 1200);
        const maxHeight = window.innerHeight - 40;
        const aspectRatio = this.canvas.width / this.canvas.height;

        let width, height;

        if (maxWidth / aspectRatio <= maxHeight) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }

        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
    }
  }

  /**
   * Load an effect and its controls
   */
  public async loadEffect(effectId: string): Promise<void> {
    debug("info", `Loading effect: ${effectId}`);

    // Find the effect definition
    const effect = effects.find((e) => e.id === effectId);
    if (!effect) {
      debug("error", `Effect not found: ${effectId}`);
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
        debug("error", `Failed to load template from ${templatePath}`);
        throw new Error(`Failed to load template: ${templatePath}`);
      }

      const templateHtml = await templateResponse.text();
      this.controlDefinitions = parseControlsFromTemplate(templateHtml);

      debug(
        "success",
        `Loaded ${this.controlDefinitions.length} controls for ${effect.name}`,
      );

      // Make controls count available globally
      window.controlsCount = this.controlDefinitions.length;

      // Initialize control values with defaults
      this.controlValues = {};
      for (const def of this.controlDefinitions) {
        debug("debug", `Setting control: ${def.id} = ${def.default}`);
        this.controlValues[def.id] = def.default;

        // Set global variables for backwards compatibility
        window[def.id] = def.default;
      }

      // Log all control values for debugging
      const globalControls: Record<string, unknown> = {};
      for (const def of this.controlDefinitions) {
        globalControls[def.id] = window[def.id];
      }
      debug("debug", "Control values initialized", globalControls);

      // Set page title to include effect name
      document.title = `${effect.name} | LightScripts Workshop`;

      // Force update the effect if the update function exists
      if (typeof window.update === "function") {
        debug("info", "Forcing initial update of effect");
        try {
          window.update(true);
        } catch (err) {
          debug("error", "Error updating effect:", err);
        }
      } else {
        debug("warn", "No global update function found");
      }

      // Update the UI
      this.renderUI();

      debug("success", `Effect "${effect.name}" is now active and rendering`);
    } catch (error) {
      debug("error", "Failed to load effect:", error);
      throw error;
    }
  }

  /**
   * Handle control value changes
   */
  private handleControlChange(id: string, value: unknown): void {
    debug("info", `Control changed: ${id} = ${value}`);

    // Update internal state
    this.controlValues[id] = value;

    // Update global variable for backward compatibility
    window[id] = value;

    // Update the UI
    this.renderUI();

    // Try to call the global update function if it exists
    if (typeof window.update === "function") {
      try {
        debug("debug", "Calling global update function");
        window.update();
        debug("success", "Effect updated successfully");
      } catch (error) {
        debug("error", "Error calling global update:", error);
      }
    } else {
      debug("warn", "Global update function not found");
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
    this.lastTime = performance.now();

    const updateFPS = () => {
      const now = performance.now();
      this.frameCount++;

      // Update every second
      if (now - this.lastTime >= 1000) {
        this.fpsValue = Math.round(
          (this.frameCount * 1000) / (now - this.lastTime),
        );

        // Update UI with new FPS value
        this.renderUI();

        this.frameCount = 0;
        this.lastTime = now;
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }

  /**
   * Take a screenshot of the canvas
   */
  private takeScreenshot(): void {
    if (!this.canvas) return;

    try {
      // Get the current time for filename
      const date = new Date();
      const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date.getSeconds().toString().padStart(2, "0")}`;

      // Get effect name for filename
      const effectName = this.currentEffect?.name || "effect";
      const safeEffectName = effectName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();

      // Create download link
      const link = document.createElement("a");
      link.download = `lightscripts_${safeEffectName}_${timestamp}.png`;

      // Force a render frame to ensure content is current
      if (typeof window.update === "function") {
        window.update();
      }

      // Convert canvas to data URL
      const dataUrl = this.canvas.toDataURL("image/png");
      link.href = dataUrl;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      debug("success", "Screenshot captured and saved");

      // Show success notification if the function exists
      if (typeof window.showNotification === "function") {
        window.showNotification("Screenshot saved!");
      }
    } catch (err) {
      debug("error", "Failed to capture screenshot:", err);

      // Show error notification if the function exists
      if (typeof window.showNotification === "function") {
        window.showNotification("Failed to take screenshot!", true);
      }
    }
  }

  /**
   * Reset all controls to their default values
   */
  private resetControls(): void {
    // Check if we should ask for confirmation
    const shouldConfirm = confirm("Reset all controls to default values?");
    if (!shouldConfirm) return;

    debug("info", "Resetting all controls to default values");

    // Reset all controls to default values
    for (const def of this.controlDefinitions) {
      // Update internal state
      this.controlValues[def.id] = def.default;

      // Update global variable
      window[def.id] = def.default;
    }

    // Update the UI
    this.renderUI();

    // Call the global update function
    if (typeof window.update === "function") {
      window.update(true);
    }

    debug("success", "All controls reset to default values");

    // Show success notification if the function exists
    if (typeof window.showNotification === "function") {
      window.showNotification("Controls reset to default values");
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    debug("info", "Shutting down engine");

    // Remove event listeners
    window.removeEventListener("resize", this.handleResize.bind(this));

    // Clear UI
    if (this.rootElement) {
      render(null, this.rootElement);
      if (this.rootElement.parentNode) {
        this.rootElement.parentNode.removeChild(this.rootElement);
      }
    }

    // Clear global variables
    this.clearGlobalVariables();

    debug("success", "Engine shut down successfully");
  }
}
