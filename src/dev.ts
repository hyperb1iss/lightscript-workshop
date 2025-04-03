/**
 * SignalRGB Lightscripts - Enhanced Development Environment
 * Automatically loads effects and generates UI from templates
 */
import { DevEngine } from "./common/engine";
import { effects } from "./index";

console.log("✨ SignalRGB Lightscripts - Enhanced Dev Environment ✨");

// Get the effect ID from URL or default to first effect
const urlParams = new URLSearchParams(window.location.search);
const effectId = urlParams.get("effect") || effects[0].id;

// Dynamically import an effect module based on its entry path
async function preloadEffect(id: string) {
  const effect = effects.find((e) => e.id === id);
  if (!effect) {
    console.error(`Effect not found: ${id}`);
    return;
  }

  try {
    // Convert relative path to absolute
    const entryPath = effect.entry.replace(/^\.\//, "./");
    // @vite-ignore
    await import(entryPath);
    console.log(`Loaded effect module: ${effect.name}`);
  } catch (error) {
    console.error(`Failed to load effect module: ${error}`);
    throw error;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, initializing DevEngine");

  try {
    // First load the effect module - this ensures the global update function is available
    await preloadEffect(effectId);

    // Initialize the DevEngine with the document body
    const engine = new DevEngine();
    await engine.initialize(document.body);

    // Start FPS monitoring
    engine.startFPSMonitor();

    // Load the requested effect
    await engine.loadEffect(effectId);

    // Force UI update by calling the global update function
    if (typeof window.update === "function") {
      window.update(true);
    }

    // Hide welcome modal if it exists
    const welcomeModal = document.getElementById("welcomeModal");
    if (welcomeModal) {
      welcomeModal.style.display = "none";
    }

    console.log("DevEngine initialized successfully");
  } catch (error) {
    console.error("Error initializing DevEngine:", error);

    // Show error on screen
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.top = "50%";
    errorDiv.style.left = "50%";
    errorDiv.style.transform = "translate(-50%, -50%)";
    errorDiv.style.padding = "20px";
    errorDiv.style.backgroundColor = "rgba(255,0,0,0.8)";
    errorDiv.style.color = "white";
    errorDiv.style.borderRadius = "10px";
    errorDiv.style.fontFamily = "monospace";
    errorDiv.style.zIndex = "9999";
    errorDiv.innerHTML = `<h2>Error Initializing DevEngine</h2><pre>${error}</pre>`;

    document.body.appendChild(errorDiv);
  }
});
