/**
 * Cyber Descent - Main Effect Class
 * Implements the Cyber Descent effect using WebGL
 */
import { WebGLEffect } from "../../common/webgl-effect";
import { CyberDescentControls } from "./types";
import {
  getCyberDescentControls,
  initializeCyberDescentControls,
} from "./utils";
import * as THREE from "three";

// Import shader code
import fragmentShader from "./fragment.glsl";

/**
 * Cyber Descent effect implementation using WebGL/Three.js
 */
export class CyberDescentEffect extends WebGLEffect<CyberDescentControls> {
  constructor() {
    super({
      id: "cyber-descent",
      name: "Cyber Descent",
      debug: true, // Enable debug mode
      fragmentShader,
    });

    // Add direct console log to verify constructor is called
    console.log("👋 CyberDescentEffect constructor called");
  }

  /**
   * Initialize the controls and their default values
   */
  protected initializeControls(): void {
    console.log("🎛️ Initializing controls");
    initializeCyberDescentControls();
  }

  /**
   * Get current control values from global scope
   */
  protected getControlValues(): CyberDescentControls {
    return getCyberDescentControls();
  }

  /**
   * Apply control values to the effect parameters
   */
  protected updateParameters(controls: CyberDescentControls): void {
    // Update uniforms is handled by the updateUniforms method
    super.updateParameters(controls);
  }

  /**
   * Create the uniforms for the shader
   */
  protected createUniforms(): Record<string, THREE.IUniform> {
    return {
      iSpeed: { value: 1.0 },
      iZoom: { value: 1.0 },
      iCyberpunkMode: { value: 0 },
      iFogDensity: { value: 1.0 },
      iLightIntensity: { value: 1.0 },
      iColorSaturation: { value: 1.0 },
      iColorIntensity: { value: 1.0 },
    };
  }

  /**
   * Update the shader uniforms with current control values
   */
  protected updateUniforms(controls: CyberDescentControls): void {
    if (!this.material) {
      this.debug("error", "Material not available for updating uniforms");
      return;
    }

    // Update all uniform values based on controls
    this.material.uniforms.iSpeed.value = controls.speed;
    this.material.uniforms.iZoom.value = controls.zoom;
    this.material.uniforms.iCyberpunkMode.value = controls.cyberpunkMode;
    this.material.uniforms.iFogDensity.value = controls.fogDensity;
    this.material.uniforms.iLightIntensity.value = controls.lightIntensity;
    this.material.uniforms.iColorSaturation.value = controls.colorSaturation;
    this.material.uniforms.iColorIntensity.value = controls.colorIntensity;
  }
}
