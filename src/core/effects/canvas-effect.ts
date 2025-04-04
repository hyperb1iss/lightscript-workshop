/**
 * CanvasEffect - Base class for Canvas 2D-based SignalRGB effects
 * Extends BaseEffect with Canvas-specific implementation
 */

import { BaseEffect, EffectConfig } from "./effect";

/**
 * Configuration for CanvasEffect
 */
export interface CanvasEffectConfig extends EffectConfig {
  // Canvas-specific options
  backgroundColor?: string;
}

/**
 * Base class for Canvas 2D-based effects
 * @template T - The control values type
 */
export abstract class CanvasEffect<T> extends BaseEffect<T> {
  // Canvas specific properties
  protected ctx: CanvasRenderingContext2D | null = null;
  protected backgroundColor: string;

  // Animation state
  protected lastFrameTime: number = 0;
  protected deltaTime: number = 0;

  /**
   * Create a new CanvasEffect
   */
  constructor(config: CanvasEffectConfig) {
    super(config);

    // Store canvas-specific options
    this.backgroundColor = config.backgroundColor || "black";

    this.debug("info", "CanvasEffect created");
  }

  /**
   * Initialize Canvas renderer and resources
   */
  protected async initializeRenderer(): Promise<void> {
    this.debug("info", "Initializing Canvas 2D renderer");

    if (!this.canvas) {
      throw new Error("Canvas element not available for initialization");
    }

    // Get 2D rendering context
    this.ctx = this.canvas.getContext("2d");

    if (!this.ctx) {
      throw new Error("Could not get 2D context from canvas");
    }

    // Set up initial canvas state
    this.ctx.imageSmoothingEnabled = true;

    // Clear canvas with background color
    this.clearCanvas();

    // Load any resources needed (images, etc.)
    await this.loadResources();

    this.debug("success", "Canvas 2D renderer initialized");
  }

  /**
   * Load effect resources (images, fonts, etc.)
   * Override this method in subclasses if needed
   */
  protected async loadResources(): Promise<void> {
    // Default implementation does nothing
    return Promise.resolve();
  }

  /**
   * Clear the canvas with the background color
   */
  protected clearCanvas(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render a frame with Canvas 2D
   * @param time Current time in seconds
   */
  protected render(time: number): void {
    if (!this.ctx || !this.canvas) return;

    // Calculate delta time
    if (this.lastFrameTime === 0) {
      this.deltaTime = 0;
    } else {
      this.deltaTime = time - this.lastFrameTime;
    }
    this.lastFrameTime = time;

    // Clear canvas before drawing
    this.clearCanvas();

    // Draw the effect (implemented by subclasses)
    this.draw(time, this.deltaTime);
  }

  /**
   * Update effect parameters from controls
   * This is called by the base class update method
   */
  protected updateParameters(controls: T): void {
    // Apply control changes (implemented by subclasses)
    this.applyControls(controls);
  }

  /**
   * Draw the effect on the canvas
   * @param time Current time in seconds
   * @param deltaTime Time since last frame in seconds
   */
  protected abstract draw(time: number, deltaTime: number): void;

  /**
   * Apply control values to the effect parameters
   */
  protected abstract applyControls(controls: T): void;
}
