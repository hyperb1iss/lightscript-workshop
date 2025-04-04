/**
 * PreactDevEngine - Development framework for effects
 * Provides a UI for controlling and testing effects
 */

import { h, render } from "preact";
import { createDebugLogger, printStartupBanner } from "./debug";
import { ControlDefinition, ControlValues } from "./definitions";
import { effects } from "../index";
import { App } from "../ui/App";

// Debug helper
const debug = createDebugLogger("PreactEngine");

/**
 * Effect definition with required paths
 */
interface EffectDefinition {
  id: string;
  entry: string;
}

/**
 * Effect metadata extracted from decorators
 */
export interface EffectMetadata {
  name: string;
  description: string;
  author: string;
}

/**
 * Full effect type including optional metadata
 */
export type EffectWithMetadata = EffectDefinition & Partial<EffectMetadata>;

/**
 * Type that matches exactly what the App component expects for effects
 * This is also what we store in the effects array
 */
type AppEffect = {
  id: string;
  entry: string;
  name?: string;
  description?: string;
  author?: string;
};

// Add the global window properties
declare global {
  interface Window {
    update?: (force?: boolean) => void;
    showNotification: (message: string, isError?: boolean) => void;
    effectInstance?: {
      stop: () => void;
      _preventInitialization?: boolean; // Flag to prevent automatic initialization
    };
    currentAnimationFrame?: number;
    controlsCount: number;
    [key: string]: unknown; // For dynamic control properties
  }
}

/**
 * Development engine for running and controlling effects
 * using a preact-based UI
 */
export class PreactDevEngine {
  // Current effect data
  private currentEffect: AppEffect | null = null;
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

    // Make the showNotification function available globally
    window.showNotification = this.showNotification.bind(this);
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

    // Set basic names for effects to ensure they're visible in UI
    for (const effect of effects as AppEffect[]) {
      if (!effect.name) {
        effect.name = effect.id;
      }
    }

    // Update UI immediately with effect names
    this.renderUI();

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
   */
  public showNotification(message: string, isError: boolean = false): void {
    debug(isError ? "error" : "info", `Notification: ${message}`);
    // In the future we can add UI notifications
  }

  /**
   * Render the UI using Preact
   */
  private renderUI(): void {
    if (!this.rootElement) return;

    render(
      h(App, {
        effects: effects as AppEffect[],
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
   * Load an effect by its ID
   */
  public async loadEffect(effectId: string): Promise<void> {
    debug("info", `Loading effect: ${effectId}`);

    // Find the effect in the effects array
    const effect = effects.find((e) => e.id === effectId) as AppEffect;
    if (!effect) {
      debug("error", `Effect not found: ${effectId}`);
      return;
    }

    // Update current effect reference
    this.currentEffect = effect;

    // Stop any existing animation and clean up
    this.cleanupCurrentEffect();

    // Reset controls
    this.controlDefinitions = [];
    this.controlValues = {};

    try {
      // Use the same approach as dev.ts for loading the effect
      const entryPath = effect.entry.replace(/^\.\//, "/src/");
      const cacheBuster = `?t=${Date.now()}`;

      debug("info", `Importing effect from ${entryPath}`);

      // Import the effect module
      const effectModule = await import(
        /* @vite-ignore */ `${entryPath}${cacheBuster}`
      );

      if (!effectModule || !effectModule.default) {
        throw new Error(`Effect module ${effectId} has no default export`);
      }

      // Extract metadata from the effect class using the decorator system
      this.extractMetadata(effect, effectModule.default);

      // Extract controls from the effect class using the decorator system
      this.extractControls(effectModule.default);

      // Update UI with the current effect and controls
      this.renderUI();

      debug("success", `Effect ${effectId} loaded and ready`);
    } catch (error) {
      debug("error", `Failed to load effect ${effectId}:`, error);
      this.showNotification(`Failed to load effect: ${error}`, true);
    }
  }

  /**
   * Extract metadata from an effect class
   */
  private extractMetadata(effect: AppEffect, effectClass: any): void {
    try {
      // First try to use the decorator system
      import("./control-decorators").then((decorators) => {
        try {
          const metadata = decorators.extractEffectMetadata(effectClass);
          if (metadata) {
            debug(
              "success",
              `Found metadata for ${effect.id}: ${metadata.name}`,
            );
            effect.name = metadata.name;
            effect.description = metadata.description;
            effect.author = metadata.author;

            // Update the UI with the new metadata
            this.renderUI();
          }
        } catch (err) {
          debug("warn", `Error extracting metadata: ${err}`);
        }
      });
    } catch (err) {
      debug("warn", `Error importing control-decorators: ${err}`);
    }
  }

  /**
   * Extract controls from an effect class
   */
  private extractControls(effectClassOrInstance: any): void {
    debug("info", "Extracting controls from effect");

    try {
      // Only use the decorator system
      import("./control-decorators")
        .then((decorators) => {
          try {
            const controls = decorators.extractControlsFromClass(
              effectClassOrInstance,
            );

            if (controls && controls.length > 0) {
              debug(
                "success",
                `Found ${controls.length} controls using decorators`,
              );

              // Filter out any huge string values that might be shader code
              const filteredControls = controls.filter((control) => {
                // Skip controls with huge string values (like shader code)
                if (control.type === "textfield") {
                  const defaultValue = String(control.default || "");
                  // If the string is very long, it's probably not a real control
                  if (defaultValue.length > 500) {
                    debug(
                      "warn",
                      `Skipping likely shader code control: ${control.id}`,
                    );
                    return false;
                  }
                }
                return true;
              });

              // Log all controls for debugging
              debug("info", "Control definitions:", filteredControls);

              this.controlDefinitions = filteredControls;

              // Initialize control values
              this.controlValues = {};
              for (const control of filteredControls) {
                // Make sure we're using the correct default values
                if (control.type === "number" || control.type === "hue") {
                  // Make sure number value is within defined range
                  const min = (control as any).min ?? 0;
                  const max = (control as any).max ?? 100;
                  const defaultValue = Number(control.default);
                  // Ensure the value is within the allowed range
                  const safeValue = Math.max(min, Math.min(max, defaultValue));
                  this.controlValues[control.id] = safeValue;
                  window[control.id] = safeValue;
                } else if (control.type === "boolean") {
                  // Convert possible 0/1 values to actual booleans
                  const defaultValue =
                    control.default === 1 ? true : Boolean(control.default);
                  this.controlValues[control.id] = defaultValue;
                  window[control.id] = defaultValue;
                } else {
                  this.controlValues[control.id] = control.default;
                  window[control.id] = control.default;
                }

                debug(
                  "info",
                  `Initialized control: ${control.id} = ${window[control.id]}`,
                );
              }

              // Update the UI with the controls
              this.renderUI();
            } else {
              debug("warn", "No controls found using decorators");
              this.controlDefinitions = [];
              this.controlValues = {};
              this.renderUI();
            }
          } catch (err) {
            debug("error", "Error extracting controls:", err);
            this.controlDefinitions = [];
            this.controlValues = {};
            this.renderUI();
          }
        })
        .catch((err) => {
          debug("error", "Error importing control-decorators:", err);
          this.controlDefinitions = [];
          this.controlValues = {};
          this.renderUI();
        });
    } catch (err) {
      debug("error", "Error in extractControls:", err);
      this.controlDefinitions = [];
      this.controlValues = {};
      this.renderUI();
    }
  }

  /**
   * Clean up the current effect and its resources
   */
  private cleanupCurrentEffect(): void {
    // Stop the effect's animation if it has a stop method
    if (
      window.effectInstance &&
      typeof window.effectInstance.stop === "function"
    ) {
      debug("info", "Stopping current effect");
      try {
        window.effectInstance.stop();
      } catch (err) {
        debug("warn", "Error stopping effect:", err);
      }
    }

    // Cancel any animation frames
    if (window.currentAnimationFrame) {
      debug("info", "Cancelling animation frame");
      cancelAnimationFrame(window.currentAnimationFrame);
      window.currentAnimationFrame = undefined;
    }

    // Clear global variables to prevent conflicts
    this.clearGlobalVariables();

    // Clear current effect instance
    window.effectInstance = undefined;

    // Need to recreate canvas to ensure clean WebGL context
    if (this.canvas) {
      const parent = this.canvas.parentElement;
      const canvasId = this.canvas.id;
      const width = this.canvas.width;
      const height = this.canvas.height;

      // Remove old canvas
      if (parent) {
        parent.removeChild(this.canvas);

        // Create new canvas
        const newCanvas = document.createElement("canvas");
        newCanvas.id = canvasId;
        newCanvas.width = width;
        newCanvas.height = height;
        parent.appendChild(newCanvas);

        // Update reference
        this.canvas = newCanvas;
      }
    }
  }

  /**
   * Handle control value changes
   */
  private handleControlChange(id: string, value: unknown): void {
    debug("info", `Control changed: ${id} = ${value}`);

    // Update internal state
    this.controlValues[id] = value;

    // Update global variable
    window[id] = value;

    // Update the UI
    this.renderUI();

    // Try to call the global update function if it exists
    if (typeof window.update === "function") {
      try {
        window.update();
      } catch (error) {
        debug("error", "Error calling update:", error);
      }
    }
  }

  /**
   * Clear global variables used by effects
   */
  private clearGlobalVariables(): void {
    // Clear control variables
    if (this.controlDefinitions.length > 0) {
      for (const def of this.controlDefinitions) {
        delete window[def.id];
      }
    }

    // Clear global effect instance and animation reference
    window.effectInstance = undefined;
    window.currentAnimationFrame = undefined;

    // Delete the update function
    delete window.update;
  }

  /**
   * Start monitoring FPS
   */
  public startFPSMonitor(): void {
    const performanceNow =
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
        ? () => performance.now()
        : () => Date.now();

    this.lastTime = performanceNow();

    const updateFPS = () => {
      const now = performanceNow();
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
      this.showNotification("Screenshot saved!");
    } catch (err) {
      debug("error", "Failed to capture screenshot:", err);
      this.showNotification("Failed to take screenshot!", true);
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
    this.showNotification("Controls reset to default values");
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    debug("info", "Shutting down engine");

    // Remove event listeners
    window.removeEventListener("resize", this.handleResize.bind(this));

    // Clean up current effect
    this.cleanupCurrentEffect();

    // Clear UI
    if (this.rootElement) {
      render(null, this.rootElement);
      if (this.rootElement.parentNode) {
        this.rootElement.parentNode.removeChild(this.rootElement);
      }
    }

    debug("success", "Engine shut down successfully");
  }
}
