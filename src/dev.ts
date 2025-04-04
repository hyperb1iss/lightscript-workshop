/**
 * Development environment entry point
 * Initializes the development environment and loads the selected effect
 */

import "./ui/styles.css";
import "./ui/sparklingName.css";
import { PreactDevEngine } from "./common/preact-engine";
import { effects } from "./index";
import { printStartupBanner } from "./common/debug";

// Display startup banner
printStartupBanner();

// Initialize effect from URL parameter or use the first effect
const urlParams = new URLSearchParams(window.location.search);
const effectId = urlParams.get("effect") || effects[0].id;

console.log(`✨ Loading effect: ${effectId}`);

/**
 * Initialize the development environment
 */
async function initializeDevEnvironment() {
  console.log("🔧 Initializing environment...");

  try {
    // Import effect dynamically
    const effectData = effects.find((e) => e.id === effectId);
    if (!effectData) {
      throw new Error(`Effect not found: ${effectId}`);
    }

    const entryPath = effectData.entry.replace(/^\.\//, "/src/");

    // Dynamic import for the effect module
    // We need to import this to trigger proper side effects, even if we don't use the module directly
    await import(/* @vite-ignore */ entryPath);

    console.log(`✅ Loaded effect module: ${effectData.name}`);

    // Initialize PreactDevEngine for UI and controls
    const engine = new PreactDevEngine();

    try {
      await engine.initialize();
      console.log("✨ Engine initialized successfully");

      // Display welcome notification
      engine.showNotification("Welcome to the LightScript Workshop!");
    } catch (err) {
      console.error("❌ Error initializing engine:", err);
    }
  } catch (error) {
    console.error("❌ Failed to load effect:", error);
  }
}

// Initialize when the DOM is ready
document.addEventListener("DOMContentLoaded", initializeDevEnvironment);
