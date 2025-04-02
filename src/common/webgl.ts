/**
 * Common utilities for WebGL and Three.js setup
 */
import * as THREE from "three";
import { createDebugLogger } from "./debug";

const debug = createDebugLogger("WebGL");

/**
 * WebGL context and renderer initialization options
 */
export interface WebGLSetupOptions {
  canvasId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  antialias?: boolean;
  forceFallback?: boolean;
}

/**
 * Initialized WebGL context and objects
 */
export interface WebGLContext {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  clock: THREE.Clock;
}

/**
 * Initialize the WebGL context, renderer, scene and camera
 * @param options - Configuration options
 * @returns The initialized WebGL context
 */
export function initializeWebGL(options: WebGLSetupOptions = {}): WebGLContext {
  const {
    canvasId = "exCanvas",
    canvasWidth = 320,
    canvasHeight = 200,
    antialias = false,
    forceFallback = false,
  } = options;

  debug("Initializing WebGL");

  // Get or create the canvas element
  let canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    debug("Canvas not found! Creating one dynamically");
    canvas = document.createElement("canvas");
    canvas.id = canvasId;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    document.body.appendChild(canvas);
  }

  debug("Canvas dimensions:", { width: canvas.width, height: canvas.height });

  // Check if we need to force software renderer
  if (forceFallback) {
    (window as any).WebGLRenderingContext = undefined;
  }

  // Create the renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias });
  renderer.setSize(canvas.width, canvas.height);

  // Create scene and camera (orthographic for fullscreen quad)
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create clock for animation timing
  const clock = new THREE.Clock();

  debug("WebGL initialization complete");

  return { canvas, renderer, scene, camera, clock };
}

/**
 * Create a full-screen shader quad for effects
 * @param vertexShader - Custom vertex shader or undefined for default
 * @param fragmentShader - Fragment shader source code
 * @param uniforms - Shader uniforms object
 * @returns The created mesh and material
 */
export function createShaderQuad(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  vertexShader?: string,
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  // Create a simple plane geometry that fills the view
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Use default vertex shader if none provided
  const defaultVertexShader = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Create shader material
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    vertexShader: vertexShader || defaultVertexShader,
    uniforms,
  });

  // Create and return the mesh
  const mesh = new THREE.Mesh(geometry, material);

  return { mesh, material };
}

/**
 * Standard animation loop with time update
 * @param context - The WebGL context
 * @param material - The shader material to update time for
 * @param updateCallback - Optional callback to run on each frame
 * @returns Animation frame ID
 */
export function startAnimationLoop(
  context: WebGLContext,
  material: THREE.ShaderMaterial,
  updateCallback?: (time: number) => void,
): number {
  const { renderer, scene, camera, clock } = context;

  // Track the current animation frame ID
  let frameId: number;

  // Animation function
  function animate(): void {
    frameId = requestAnimationFrame(animate);

    // Update time uniform
    const elapsedTime = clock.getElapsedTime();
    if (material.uniforms.iTime) {
      material.uniforms.iTime.value = elapsedTime;
    }

    // Call update callback if provided
    if (updateCallback) {
      updateCallback(elapsedTime);
    }

    // Render the scene
    renderer.render(scene, camera);
  }

  // Start animation loop
  animate();
  return frameId!;
}

/**
 * Create standard Three.js uniforms for effects
 * @param canvas - The canvas element
 * @returns Common shader uniforms
 */
export function createStandardUniforms(
  canvas: HTMLCanvasElement,
): Record<string, THREE.IUniform> {
  return {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
    iMouse: { value: new THREE.Vector2(0, 0) },
  };
}
