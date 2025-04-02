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
const debug = createDebugLogger("PuffStuff", true);

// Log initialization immediately
debug("Script loaded", { timestamp: new Date().toISOString() });

// WebGL context and objects
let webGLContext: WebGLContext;
let material: THREE.ShaderMaterial;

// Controls interface
export interface Controls {
  speed: number;
  colorShift: boolean;
  colorScheme: number;
  effectStyle: number;
  colorIntensity: number;
  colorPulse: number;
  motionWave: number;
  motionReverse: boolean;
  colorSaturation: number;
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

  // Handle colorShift boolean conversion
  let globalColorShift = boolToInt((window as any).colorShift);

  // Handle string/number for colorScheme
  let globalColorScheme = (window as any).colorScheme;
  if (typeof globalColorScheme === "string") {
    const schemes = [
      "Classic Blue",
      "Cyberpunk",
      "Fire",
      "Toxic",
      "Ethereal",
      "Monochrome",
      "Rainbow",
      "Electric",
      "Amethyst",
      "Coral Reef",
      "Deep Sea",
      "Emerald",
      "Neon",
      "Rose Gold",
      "Sunset",
      "Vapor Wave",
    ];
    globalColorScheme = schemes.indexOf(globalColorScheme);
    if (globalColorScheme === -1) globalColorScheme = 0;
  } else {
    globalColorScheme = Number(globalColorScheme || 0);
  }

  // Handle effectStyle string/number conversion
  let globalEffectStyle = (window as any).effectStyle;
  if (typeof globalEffectStyle === "string") {
    const styles = ["Standard", "Wireframe", "Glitch", "Hologram", "Film Noir"];
    globalEffectStyle = styles.indexOf(globalEffectStyle);
    if (globalEffectStyle === -1) globalEffectStyle = 0;
  } else {
    globalEffectStyle = Number(globalEffectStyle || 0);
  }

  const globalColorIntensity = normalizePercentage(
    (window as any).colorIntensity || 100,
  );
  const globalColorPulse = Number((window as any).colorPulse || 0) / 10;
  const globalMotionWave = Number((window as any).motionWave || 0) / 10;
  const globalMotionReverse = boolToInt((window as any).motionReverse);
  const globalColorSaturation = normalizePercentage(
    (window as any).colorSaturation || 100,
  );

  if (force) {
    debug("Control values:", {
      speed: globalSpeed,
      colorShift: globalColorShift,
      colorScheme: globalColorScheme,
      effectStyle: globalEffectStyle,
      colorIntensity: globalColorIntensity,
      colorPulse: globalColorPulse,
      motionWave: globalMotionWave,
      motionReverse: globalMotionReverse,
      colorSaturation: globalColorSaturation,
    });
  }

  // Update shader uniforms
  material.uniforms.iSpeed.value = globalSpeed;
  material.uniforms.iColorShift.value = globalColorShift === 1;
  material.uniforms.iColorScheme.value = globalColorScheme;
  material.uniforms.iEffectStyle.value = globalEffectStyle;
  material.uniforms.iColorIntensity.value = globalColorIntensity;
  material.uniforms.iColorPulse.value = globalColorPulse;
  material.uniforms.iMotionWave.value = globalMotionWave;
  material.uniforms.iMotionReverse.value = globalMotionReverse === 1;
  material.uniforms.iColorSaturation.value = globalColorSaturation;
};

// Initialize everything
function initWebGLEffect() {
  debug("Initializing Puff Stuff effect");

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
      iColorShift: { value: true },
      iColorScheme: { value: 0 },
      iEffectStyle: { value: 0 },
      iColorIntensity: { value: 1.0 },
      iColorPulse: { value: 0.0 },
      iMotionWave: { value: 0.0 },
      iMotionReverse: { value: false },
      iColorSaturation: { value: 1.0 },
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
