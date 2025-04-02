import * as THREE from "three";
import {
  createDebugLogger,
  initializeWebGL,
  createShaderQuad,
  startAnimationLoop,
  createStandardUniforms,
  initializeEffect,
  WebGLContext,
  normalizeSpeed,
  normalizePercentage,
  boolToInt,
} from "../../common";

// Import shader code
import fragmentShader from "./fragment.glsl";
import vertexShader from "./vertex.glsl";

// Create a debug logger for this effect
const debug = createDebugLogger("SimpleWave", true);

// Log initialization immediately
debug("Script loaded", { timestamp: new Date().toISOString() });

// WebGL context and objects
let webGLContext: WebGLContext;
let material: THREE.ShaderMaterial;

// Controls interface
export interface Controls {
  speed: number;
  waveCount: number;
  colorMode: number;
  colorSpeed: number;
  reverseDirection: boolean;
  colorIntensity: number;
  waveHeight: number;
}

// Make an update function globally available
// This will update the shader uniforms from the global variables
(window as any).update = function (force = false) {
  // Only log on forced updates or occasionally to reduce spam
  if (force || Math.random() < 0.01) {
    debug("Update called");
  }

  if (!material) {
    if (force) debug("Material not initialized yet in update()");
    return;
  }

  // Access variables directly from global scope
  const globalSpeed = normalizeSpeed((window as any).speed || 5);
  const globalWaveCount = Number((window as any).waveCount || 5);

  // Handle string/number for colorMode
  let globalColorMode = (window as any).colorMode;
  if (typeof globalColorMode === "string") {
    const modes = ["Rainbow", "Ocean", "Fire", "Neon", "Mono"];
    globalColorMode = modes.indexOf(globalColorMode);
    if (globalColorMode === -1) globalColorMode = 0;
  } else {
    globalColorMode = Number(globalColorMode || 0);
  }

  const globalColorSpeed = normalizeSpeed((window as any).colorSpeed || 3);
  const globalReverseDirection = boolToInt((window as any).reverseDirection);
  const globalColorIntensity = normalizePercentage(
    (window as any).colorIntensity || 100,
  );
  const globalWaveHeight = Number((window as any).waveHeight || 50) / 100;

  if (force) {
    debug("Control values:", {
      speed: globalSpeed,
      waveCount: globalWaveCount,
      colorMode: globalColorMode,
      colorSpeed: globalColorSpeed,
      reverseDirection: globalReverseDirection,
      colorIntensity: globalColorIntensity,
      waveHeight: globalWaveHeight,
    });
  }

  // Update shader uniforms
  material.uniforms.iSpeed.value = globalSpeed;
  material.uniforms.iWaveCount.value = globalWaveCount;
  material.uniforms.iColorMode.value = globalColorMode;
  material.uniforms.iColorSpeed.value = globalColorSpeed;
  material.uniforms.iReverseDirection.value = globalReverseDirection === 1;
  material.uniforms.iColorIntensity.value = globalColorIntensity;
  material.uniforms.iWaveHeight.value = globalWaveHeight;
};

// Initialize everything
function initWebGLEffect() {
  debug("Initializing Simple Wave effect");

  try {
    // Check for existing canvas
    const existingCanvas = document.getElementById("exCanvas");
    if (!existingCanvas) {
      console.error(
        'Canvas element with ID "exCanvas" not found. Cannot initialize effect.',
      );
      return;
    }

    // Use our common WebGL initialization function
    webGLContext = initializeWebGL({
      canvasId: "exCanvas",
      canvasWidth: 320,
      canvasHeight: 200,
      antialias: false,
    });

    const { canvas, scene } = webGLContext;

    // Ensure canvas is visible
    canvas.style.display = "block";

    debug(
      `Renderer initialized with canvas size: ${canvas.width}x${canvas.height}`,
    );

    // Create standard uniforms
    const uniforms = {
      ...createStandardUniforms(canvas),
      // Additional uniforms specific to this effect
      iSpeed: { value: 1.0 },
      iWaveCount: { value: 5.0 },
      iColorMode: { value: 0 },
      iColorSpeed: { value: 1.0 },
      iReverseDirection: { value: false },
      iColorIntensity: { value: 1.0 },
      iWaveHeight: { value: 0.5 },
    };

    // Create shader mesh and material using our common utility and imported shaders
    const { mesh, material: shaderMaterial } = createShaderQuad(
      fragmentShader,
      uniforms,
      vertexShader,
    );

    // Store material for global updates
    material = shaderMaterial;

    debug("Shader material created");

    // Add mesh to scene
    scene.add(mesh);
    debug("Mesh added to scene");

    // Make initial update call to ensure all controls are applied
    (window as any).update(true);

    // Start animation loop using our common utility
    debug("Starting animation loop");

    startAnimationLoop(webGLContext, material, (time) => {
      // Update to catch any control changes from SignalRGB
      if (time % 0.1 < 0.02) {
        // Less frequent updates
        (window as any).update();
      }

      // Log occasionally to avoid flooding the console
      if (time % 10 < 0.1) {
        debug("Animation frame", { time: time.toFixed(2) });
      }
    });

    debug("Initialization complete");
  } catch (error) {
    debug("ERROR during initialization:", error);
    console.error("Failed to initialize WebGL effect:", error);

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
          ctx.fillText("Error initializing effect", 20, 50);
          ctx.fillText(String(error).substring(0, 40), 20, 70);
        }
      }
    } catch (e) {
      // If even this fails, just log it
      console.error("Could not display error message:", e);
    }
  }
}

// Wait a moment to ensure the DOM is ready before initializing
setTimeout(() => {
  initializeEffect(initWebGLEffect);
}, 10);

// Also trigger initialization on window load just to be safe
window.addEventListener("load", () => {
  if (!material) {
    debug("Initializing on window load event");
    initializeEffect(initWebGLEffect);
  }
});
