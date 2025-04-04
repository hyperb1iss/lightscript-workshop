/**
 * Development environment entry point
 * Initializes the development environment and loads the selected effect
 */

import "./ui"; // Import styles via UI index
import { PreactDevEngine } from "./engine/preact-engine";
import { effects } from "../index";
import { printStartupBanner } from "../core/utils/debug";

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
    // Initialize PreactDevEngine for UI and controls first
    const engine = new PreactDevEngine();

    // Find effect data
    const effectData = effects.find((e) => e.id === effectId);
    if (!effectData) {
      throw new Error(`Effect not found: ${effectId}`);
    }

    // Import effect dynamically after engine initialization
    const entryPath = effectData.entry.replace(/^\.\//, "/src/");

    // Dynamic import for the effect module
    // Add cache-busting to ensure we get a fresh module
    const cacheBuster = `?t=${Date.now()}`;
    await import(/* @vite-ignore */ `${entryPath}${cacheBuster}`);

    console.log(`✅ Loaded effect module: ${effectData.id}`);

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
