/**
 * SignalRGB Lightscripts - Enhanced Development Environment
 * Automatically loads effects and generates UI from templates
 */
import { DevEngine } from "./common/engine";
import { effects } from "./index";

console.log("✨ SignalRGB Lightscripts - Dev Environment ✨");

// Get the effect ID from URL or default to first effect
const urlParams = new URLSearchParams(window.location.search);
const effectId = urlParams.get("effect") || effects[0].id;

// Log the selected effect
if (urlParams.get("effect")) {
  console.log(`🚀 Loading effect: ${effectId}`);
} else {
  console.log(`🚀 Loading default effect: ${effectId}`);
  console.log(`💡 Tip: Use ?effect=<id> in URL to specify a different effect`);
}

// Dynamically import an effect module based on its entry path
async function preloadEffect(id: string): Promise<void> {
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
    console.log(`✅ Loaded effect module: ${effect.name}`);
  } catch (error) {
    console.error(`❌ Failed to load effect module:`, error);
    throw error;
  }
}

// Initialize the DevEngine and load the effect
async function initializeDevEnvironment(): Promise<void> {
  console.log("🔧 Initializing development environment...");
  
  try {
    // Hide the welcome modal after a short delay
    setTimeout(() => {
      const welcomeModal = document.getElementById("welcomeModal");
      if (welcomeModal) {
        welcomeModal.style.display = "none";
      }
    }, 2000);
    
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

    // Hide loader
    const loader = document.getElementById("initialLoader");
    if (loader) {
      loader.style.display = "none";
    }

    console.log("✨ DevEngine initialized successfully");
    
    // Show a little notification that appears and fades out
    showNotification(`${effects.find(e => e.id === effectId)?.name || 'Effect'} loaded successfully!`);
  } catch (error) {
    console.error("❌ Error initializing DevEngine:", error);

    // Show error on screen
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.top = "50%";
    errorDiv.style.left = "50%";
    errorDiv.style.transform = "translate(-50%, -50%)";
    errorDiv.style.padding = "25px";
    errorDiv.style.backgroundColor = "rgba(12, 12, 26, 0.95)";
    errorDiv.style.color = "#ff71ce";
    errorDiv.style.borderRadius = "4px";
    errorDiv.style.fontFamily = "'Rajdhani', sans-serif";
    errorDiv.style.zIndex = "9999";
    errorDiv.style.maxWidth = "80%";
    errorDiv.style.boxShadow = "0 0 20px rgba(255, 113, 206, 0.4)";
    errorDiv.style.border = "1px solid rgba(255, 113, 206, 0.3)";
    errorDiv.style.backdropFilter = "blur(5px)";

    // Add glowing top border
    const topBorder = document.createElement("div");
    topBorder.style.position = "absolute";
    topBorder.style.top = "0";
    topBorder.style.left = "0";
    topBorder.style.right = "0";
    topBorder.style.height = "2px";
    topBorder.style.background = "linear-gradient(90deg, #ff71ce, #b967ff)";
    topBorder.style.borderRadius = "4px 4px 0 0";
    errorDiv.appendChild(topBorder);

    const errorTitle = document.createElement("h2");
    errorTitle.innerHTML = "⚠️ Error Loading Effect";
    errorTitle.style.color = "#ff71ce";
    errorTitle.style.margin = "0 0 15px 0";
    errorTitle.style.textShadow = "0 0 5px rgba(255, 113, 206, 0.5)";
    
    const errorMessage = document.createElement("pre");
    errorMessage.textContent = String(error);
    errorMessage.style.color = "#fffb96";
    errorMessage.style.background = "rgba(12, 12, 35, 0.5)";
    errorMessage.style.padding = "10px";
    errorMessage.style.borderRadius = "3px";
    errorMessage.style.fontFamily = "monospace";
    errorMessage.style.overflow = "auto";
    errorMessage.style.maxHeight = "200px";
    
    errorDiv.appendChild(errorTitle);
    errorDiv.appendChild(errorMessage);

    // Add a close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Dismiss";
    closeButton.style.background = "transparent";
    closeButton.style.color = "#05ffa1";
    closeButton.style.border = "1px solid #05ffa1";
    closeButton.style.padding = "8px 15px";
    closeButton.style.borderRadius = "3px";
    closeButton.style.marginTop = "15px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontFamily = "'Rajdhani', sans-serif";
    closeButton.style.letterSpacing = "1px";
    closeButton.style.boxShadow = "0 0 5px rgba(5, 255, 161, 0.3)";
    closeButton.style.transition = "all 0.2s ease";
    
    closeButton.addEventListener("mouseover", () => {
      closeButton.style.background = "#05ffa1";
      closeButton.style.color = "#0c0c16";
      closeButton.style.boxShadow = "0 0 10px rgba(5, 255, 161, 0.7)";
    });
    
    closeButton.addEventListener("mouseout", () => {
      closeButton.style.background = "transparent";
      closeButton.style.color = "#05ffa1";
      closeButton.style.boxShadow = "0 0 5px rgba(5, 255, 161, 0.3)";
    });
    
    closeButton.addEventListener("click", () => {
      errorDiv.remove();
    });
    
    errorDiv.appendChild(closeButton);
    document.body.appendChild(errorDiv);

    // Hide loader
    const loader = document.getElementById("initialLoader");
    if (loader) {
      loader.style.display = "none";
    }
  }
}

/**
 * Show a temporary notification
 */
function showNotification(message: string, duration = 3000): void {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%)";
  notification.style.backgroundColor = "rgba(12, 12, 26, 0.9)";
  notification.style.color = "#05ffa1";
  notification.style.padding = "10px 25px";
  notification.style.borderRadius = "4px";
  notification.style.zIndex = "1000";
  notification.style.fontWeight = "bold";
  notification.style.boxShadow = "0 0 15px rgba(5, 255, 161, 0.4)";
  notification.style.border = "1px solid rgba(5, 255, 161, 0.3)";
  notification.style.transition = "opacity 0.5s ease-in-out, transform 0.3s ease-out";
  notification.style.fontFamily = "'Rajdhani', sans-serif";
  notification.style.letterSpacing = "1px";
  notification.style.textShadow = "0 0 5px rgba(5, 255, 161, 0.7)";
  
  // Add glowing top border
  const topBorder = document.createElement("div");
  topBorder.style.position = "absolute";
  topBorder.style.top = "0";
  topBorder.style.left = "0";
  topBorder.style.right = "0";
  topBorder.style.height = "2px";
  topBorder.style.background = "linear-gradient(90deg, #05ffa1, #01cdfe)";
  topBorder.style.borderRadius = "4px 4px 0 0";
  notification.appendChild(topBorder);
  
  document.body.appendChild(notification);
  
  // Add a little pop animation on entrance
  notification.style.transform = "translateX(-50%) translateY(20px)";
  setTimeout(() => {
    notification.style.transform = "translateX(-50%) translateY(0)";
  }, 10);
  
  // Fade out and remove after duration
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => notification.remove(), 500);
  }, duration);
}

// Start initialization when DOM is ready
document.addEventListener("DOMContentLoaded", initializeDevEnvironment);
