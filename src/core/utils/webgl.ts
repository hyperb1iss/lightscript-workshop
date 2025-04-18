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
  canvasElement?: HTMLCanvasElement;
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
    canvasElement,
    canvasWidth = 320,
    canvasHeight = 200,
    antialias = false,
    forceFallback = false,
  } = options;

  debug("info", "Initializing WebGL context");

  // Get or create the canvas element
  let canvas = canvasElement;
  if (!canvas) {
    canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      debug("warn", "Canvas not found! Creating one dynamically");
      canvas = document.createElement("canvas");
      canvas.id = canvasId;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      document.body.appendChild(canvas);
    }
  }

  debug("debug", "Canvas dimensions", {
    width: canvas.width,
    height: canvas.height,
  });

  // Check if we need to force software renderer
  if (forceFallback) {
    debug("warn", "Forcing software renderer fallback");
    // Make WebGLRenderingContext unavailable to force software fallback
    // Need to use 'any' here because we're deliberately doing something unsafe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).WebGLRenderingContext = undefined;
  }

  // Create the renderer with preserved drawing buffer for screenshots
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias,
    preserveDrawingBuffer: true, // Essential for screenshots to work
  });
  renderer.setSize(canvas.width, canvas.height);

  // Create scene and camera (orthographic for fullscreen quad)
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create clock for animation timing
  const clock = new THREE.Clock();

  debug("success", "WebGL initialization complete");

  return { canvas, renderer, scene, camera, clock };
}

/**
 * Create a full-screen shader quad for effects
 * @param fragmentShader - Fragment shader source code
 * @param uniforms - Shader uniforms object
 * @param vertexShader - Custom vertex shader or undefined for default
 * @returns The created mesh and material
 */
export function createShaderQuad(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  vertexShader?: string,
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  debug("info", "Creating shader quad");

  // Create a simple plane geometry that fills the view
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Simply use the default shader material setup, THREE.js will handle the attributes
  const material = new THREE.ShaderMaterial({
    fragmentShader: fragmentShader,
    vertexShader: vertexShader || THREE.ShaderLib.basic.vertexShader,
    uniforms: uniforms,
  });

  // Create and return the mesh
  const mesh = new THREE.Mesh(geometry, material);

  debug(
    "debug",
    "Shader material created with uniforms",
    Object.keys(uniforms),
  );

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
  debug("info", "Starting animation loop");

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
  debug("debug", "Creating standard uniforms");

  return {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
    iMouse: { value: new THREE.Vector2(0, 0) },
  };
}
