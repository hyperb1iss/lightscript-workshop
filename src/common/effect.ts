/**
 * BaseEffect - Core class for all SignalRGB effects
 * Provides standardized initialization, control handling, and rendering
 */

import * as THREE from "three";
import {
  WebGLContext,
  initializeWebGL,
  createShaderQuad,
  startAnimationLoop,
  createStandardUniforms,
} from "./webgl";
import { createDebugLogger } from "./debug";

/**
 * Configuration for BaseEffect
 */
export interface EffectConfig {
  id: string;
  name: string;
  debug?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  fragmentShader: string;
  vertexShader?: string;
}

/**
 * Abstract base class for all effects
 * @template T - The control values type, can be any type with string keys
 */
export abstract class BaseEffect<T> {
  // Core properties
  protected id: string;
  protected name: string;
  protected debug: ReturnType<typeof createDebugLogger>;
  protected webGLContext: WebGLContext | null = null;
  protected material: THREE.ShaderMaterial | null = null;
  protected animationId: number | null = null;
  protected customUniforms: Record<string, THREE.IUniform> = {};
  protected fragmentShader: string;
  protected vertexShader?: string;
  protected canvasWidth: number;
  protected canvasHeight: number;

  /**
   * Create a new BaseEffect
   */
  constructor(config: EffectConfig) {
    this.id = config.id;
    this.name = config.name;
    this.debug = createDebugLogger(this.name, config.debug ?? false);

    // Store shaders
    this.fragmentShader = config.fragmentShader;
    this.vertexShader = config.vertexShader;

    // Canvas dimensions
    this.canvasWidth = config.canvasWidth ?? 320;
    this.canvasHeight = config.canvasHeight ?? 200;

    // Log initialization
    this.debug("Effect created", { id: this.id, name: this.name });
  }

  /**
   * Initialize the effect
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    this.debug("Initializing effect");

    try {
      // Initialize WebGL context
      this.webGLContext = initializeWebGL({
        canvasId: "exCanvas",
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
      });

      const { canvas, scene } = this.webGLContext;

      // Create uniforms
      const standardUniforms = createStandardUniforms(canvas);
      this.customUniforms = this.createUniforms();

      const uniforms = {
        ...standardUniforms,
        ...this.customUniforms,
      };

      // Create shader quad
      const { mesh, material } = createShaderQuad(
        this.fragmentShader,
        uniforms,
        this.vertexShader,
      );

      // Store material for updates
      this.material = material;

      // Add mesh to scene
      scene.add(mesh);

      // Initialize controls and register global update function
      this.initializeControls();

      // Make the update function globally available for SignalRGB
      window.update = this.update.bind(this);

      // Start animation loop
      this.startAnimation();

      this.debug("Initialization complete");
    } catch (error) {
      this.debug("ERROR during initialization:", error);
      this.handleInitError(error);
    }
  }

  /**
   * Start the animation loop
   */
  protected startAnimation(): void {
    if (!this.webGLContext || !this.material) {
      this.debug(
        "Cannot start animation - context or material not initialized",
      );
      return;
    }

    this.debug("Starting animation loop");

    this.animationId = startAnimationLoop(
      this.webGLContext,
      this.material,
      (time) => this.onFrame(time),
    );
  }

  /**
   * Stop the animation loop
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.debug("Animation stopped");
    }
  }

  /**
   * Called on every animation frame
   * @param time Current time in seconds
   */
  protected onFrame(time: number): void {
    // Call update occasionally to catch control changes
    if (time % 0.1 < 0.02) {
      this.update();
    }

    // Log occasionally
    if (time % 10 < 0.1) {
      this.debug("Animation frame", { time: time.toFixed(2) });
    }
  }

  /**
   * Update effect parameters from controls
   * This is called by SignalRGB when controls change
   */
  public update(force: boolean = false): void {
    if (!this.material) {
      if (force) this.debug("Material not initialized yet in update()");
      return;
    }

    // Get current control values
    const controls = this.getControlValues();

    // Update shader uniforms
    this.updateUniforms(controls);

    // Log control values occasionally
    if (force || Math.random() < 0.01) {
      this.debug("Control values updated:", controls);
    }
  }

  /**
   * Handle initialization errors
   */
  protected handleInitError(error: unknown): void {
    console.error(`Failed to initialize ${this.name}:`, error);

    // Try to display error message on canvas
    try {
      const canvas = document.getElementById("exCanvas") as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "red";
          ctx.font = "14px Arial";
          ctx.fillText(`Error initializing ${this.name}`, 20, 50);
          ctx.fillText(String(error).substring(0, 40), 20, 70);
        }
      }
    } catch (e) {
      console.error("Could not display error message:", e);
    }
  }

  /**
   * Abstract methods that must be implemented by derived classes
   */

  /**
   * Initialize controls specific to this effect
   */
  protected abstract initializeControls(): void;

  /**
   * Get current control values from global scope
   */
  protected abstract getControlValues(): T;

  /**
   * Create custom uniforms for this effect
   */
  protected abstract createUniforms(): Record<string, THREE.IUniform>;

  /**
   * Update shader uniforms with current control values
   */
  protected abstract updateUniforms(controls: T): void;
}
