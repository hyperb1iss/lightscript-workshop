// Debug logging
console.log("✨ SignalRGB Lightscripts Dev Environment ✨");

import { effects } from "./index";

// Get the effect to load from URL or default to the first one
const urlParams = new URLSearchParams(window.location.search);
const effectId = urlParams.get("effect") || effects[0].id;

// Find the selected effect
const selectedEffect = effects.find((e) => e.id === effectId) || effects[0];
console.log(`Loading effect: ${selectedEffect.name} (${selectedEffect.id})`);

// Set up global variables based on the selected effect
if (effectId === "puff-stuff") {
  // Puff Stuff variables
  if (typeof (window as any).speed === "undefined") {
    (window as any).speed = 1;
  }

  if (typeof (window as any).colorShift === "undefined") {
    (window as any).colorShift = 1;
  }

  if (typeof (window as any).colorScheme === "undefined") {
    (window as any).colorScheme = 0;
  }

  if (typeof (window as any).effectStyle === "undefined") {
    (window as any).effectStyle = 0;
  }

  if (typeof (window as any).colorIntensity === "undefined") {
    (window as any).colorIntensity = 100;
  }

  if (typeof (window as any).colorPulse === "undefined") {
    (window as any).colorPulse = 0;
  }

  if (typeof (window as any).motionWave === "undefined") {
    (window as any).motionWave = 0;
  }

  if (typeof (window as any).motionReverse === "undefined") {
    (window as any).motionReverse = 0;
  }

  if (typeof (window as any).colorSaturation === "undefined") {
    (window as any).colorSaturation = 100;
  }
} else if (effectId === "simple-wave") {
  // Simple Wave variables
  if (typeof (window as any).speed === "undefined") {
    (window as any).speed = 5;
  }

  if (typeof (window as any).waveCount === "undefined") {
    (window as any).waveCount = 5;
  }

  if (typeof (window as any).colorMode === "undefined") {
    (window as any).colorMode = 0;
  }

  if (typeof (window as any).colorSpeed === "undefined") {
    (window as any).colorSpeed = 3;
  }

  if (typeof (window as any).reverseDirection === "undefined") {
    (window as any).reverseDirection = 0;
  }

  if (typeof (window as any).colorIntensity === "undefined") {
    (window as any).colorIntensity = 100;
  }

  if (typeof (window as any).waveHeight === "undefined") {
    (window as any).waveHeight = 50;
  }
}

// Create common test UI
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded, setting up local testing UI");

  if (document.body) {
    // Create effect selector
    const selectorContainer = document.createElement("div");
    selectorContainer.style.position = "fixed";
    selectorContainer.style.top = "10px";
    selectorContainer.style.right = "10px";
    selectorContainer.style.padding = "10px";
    selectorContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
    selectorContainer.style.color = "white";
    selectorContainer.style.fontFamily = "Arial, sans-serif";
    selectorContainer.style.borderRadius = "5px";
    selectorContainer.style.zIndex = "1000";
    document.body.appendChild(selectorContainer);

    const effectLabel = document.createElement("label");
    effectLabel.textContent = "Effect: ";

    const effectSelect = document.createElement("select");
    effectSelect.id = "effectSelect";

    effects.forEach((effect) => {
      const option = document.createElement("option");
      option.value = effect.id;
      option.textContent = effect.name;
      if (effect.id === effectId) {
        option.selected = true;
      }
      effectSelect.appendChild(option);
    });

    effectSelect.addEventListener("change", () => {
      const newEffectId = effectSelect.value;
      window.location.href = `?effect=${newEffectId}`;
    });

    selectorContainer.appendChild(effectLabel);
    selectorContainer.appendChild(effectSelect);

    // Create the UI specific to the current effect
    if (effectId === "puff-stuff") {
      createPuffStuffUI();
    } else if (effectId === "simple-wave") {
      createSimpleWaveUI();
    }
  }
});

// Function to create UI for Puff Stuff
function createPuffStuffUI() {
  // Color scheme to CSS mapping for the indicator
  const colorSchemeStyles = [
    "linear-gradient(135deg, #3b83ff, #0052cc)", // Classic Blue
    "linear-gradient(135deg, #9d4edd, #5a189a)", // Cyberpunk
    "linear-gradient(135deg, #ff5500, #ff0000, #cc0000)", // Fire
    "linear-gradient(135deg, #a7f542, #2d801c)", // Toxic
    "linear-gradient(135deg, #caf0f8, #9381ff)", // Ethereal
    "linear-gradient(135deg, #ffffff, #333333)", // Monochrome
    "linear-gradient(135deg, #ff0000, #00ff00, #0000ff)", // Rainbow
    "linear-gradient(135deg, #00d4ff, #090979)", // Electric
    "linear-gradient(135deg, #9b5de5, #6a0dad)", // Amethyst
    "linear-gradient(135deg, #ff9e00, #e35757, #00b4d8)", // Coral Reef
    "linear-gradient(135deg, #03045e, #023e8a, #0077b6)", // Deep Sea
    "linear-gradient(135deg, #2d6a4f, #40916c, #52b788)", // Emerald
    "linear-gradient(135deg, #ff2a6d, #05d9e8, #d1f7ff)", // Neon
    "linear-gradient(135deg, #e8a598, #c89f9c, #ddbea9)", // Rose Gold
    "linear-gradient(135deg, #ff7e00, #fe6d73, #9381ff)", // Sunset
    "linear-gradient(135deg, #ff71ce, #01cdfe, #b967ff)", // Vapor Wave
  ];

  // FPS tracking
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 0;

  const canvas = document.getElementById("exCanvas") as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  // Create UI container
  const uiContainer = document.createElement("div");
  uiContainer.style.position = "fixed";
  uiContainer.style.top = "10px";
  uiContainer.style.left = "10px";
  uiContainer.style.padding = "10px";
  uiContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
  uiContainer.style.color = "white";
  uiContainer.style.fontFamily = "Arial, sans-serif";
  uiContainer.style.borderRadius = "5px";
  uiContainer.style.zIndex = "1000";
  document.body.appendChild(uiContainer);

  // Add FPS counter
  const fpsCounter = document.createElement("div");
  fpsCounter.id = "fpsCounter";
  fpsCounter.textContent = "-- FPS";
  uiContainer.appendChild(fpsCounter);

  // Add speedSlider
  const speedLabel = document.createElement("label");
  speedLabel.textContent = "Speed: ";
  speedLabel.style.display = "block";
  speedLabel.style.marginTop = "10px";

  const speedValue = document.createElement("span");
  speedValue.id = "speedValue";
  speedValue.textContent = "1.0";
  speedLabel.appendChild(speedValue);

  const speedSlider = document.createElement("input");
  speedSlider.id = "speedSlider";
  speedSlider.type = "range";
  speedSlider.min = "0.1";
  speedSlider.max = "5";
  speedSlider.step = "0.1";
  speedSlider.value = "1";

  uiContainer.appendChild(speedLabel);
  uiContainer.appendChild(speedSlider);

  // Add colorShift toggle
  const colorShiftLabel = document.createElement("label");
  colorShiftLabel.textContent = "Color Shift: ";
  colorShiftLabel.style.display = "block";
  colorShiftLabel.style.marginTop = "10px";

  const colorShiftToggle = document.createElement("input");
  colorShiftToggle.id = "colorShiftToggle";
  colorShiftToggle.type = "checkbox";
  colorShiftToggle.checked = true;

  colorShiftLabel.appendChild(colorShiftToggle);
  uiContainer.appendChild(colorShiftLabel);

  // Add color scheme selector
  const colorSchemeLabel = document.createElement("label");
  colorSchemeLabel.textContent = "Color Scheme: ";
  colorSchemeLabel.style.display = "block";
  colorSchemeLabel.style.marginTop = "10px";

  const colorSchemeSelect = document.createElement("select");
  colorSchemeSelect.id = "colorScheme";

  // Create a sorted array of color scheme names
  const schemeOptions = [
    "Amethyst",
    "Classic Blue",
    "Coral Reef",
    "Cyberpunk",
    "Deep Sea",
    "Electric",
    "Emerald",
    "Ethereal",
    "Fire",
    "Monochrome",
    "Rainbow",
    "Rose Gold",
    "Sunset",
    "Toxic",
    "Vapor Wave",
  ];

  // Create a mapping of display names to indices in the original array
  const schemeIndices: { [key: string]: number } = {
    "Classic Blue": 0,
    Cyberpunk: 1,
    Fire: 2,
    Toxic: 3,
    Ethereal: 4,
    Monochrome: 5,
    Rainbow: 6,
    Electric: 7,
    Amethyst: 8,
    "Coral Reef": 9,
    "Deep Sea": 10,
    Emerald: 11,
    Neon: 12,
    "Rose Gold": 13,
    Sunset: 14,
    "Vapor Wave": 15,
  };

  schemeOptions.forEach((option) => {
    const optElement = document.createElement("option");
    optElement.value = schemeIndices[option].toString();
    optElement.textContent = option;
    colorSchemeSelect.appendChild(optElement);
  });

  uiContainer.appendChild(colorSchemeLabel);
  uiContainer.appendChild(colorSchemeSelect);

  // Add effect style selector
  const effectStyleLabel = document.createElement("label");
  effectStyleLabel.textContent = "Effect Style: ";
  effectStyleLabel.style.display = "block";
  effectStyleLabel.style.marginTop = "10px";

  const effectStyleSelect = document.createElement("select");
  effectStyleSelect.id = "effectStyle";

  const styleOptions = [
    "Standard",
    "Wireframe",
    "Glitch",
    "Hologram",
    "Film Noir",
  ];
  styleOptions.forEach((option, index) => {
    const optElement = document.createElement("option");
    optElement.value = index.toString();
    optElement.textContent = option;
    effectStyleSelect.appendChild(optElement);
  });

  uiContainer.appendChild(effectStyleLabel);
  uiContainer.appendChild(effectStyleSelect);

  // Add color intensity slider
  const colorIntensityLabel = document.createElement("label");
  colorIntensityLabel.textContent = "Color Intensity: ";
  colorIntensityLabel.style.display = "block";
  colorIntensityLabel.style.marginTop = "10px";

  const colorIntensityValue = document.createElement("span");
  colorIntensityValue.id = "colorIntensityValue";
  colorIntensityValue.textContent = "100";
  colorIntensityLabel.appendChild(colorIntensityValue);

  const colorIntensitySlider = document.createElement("input");
  colorIntensitySlider.id = "colorIntensitySlider";
  colorIntensitySlider.type = "range";
  colorIntensitySlider.min = "0";
  colorIntensitySlider.max = "200";
  colorIntensitySlider.step = "5";
  colorIntensitySlider.value = "100";

  uiContainer.appendChild(colorIntensityLabel);
  uiContainer.appendChild(colorIntensitySlider);

  // Add color pulse slider
  const colorPulseLabel = document.createElement("label");
  colorPulseLabel.textContent = "Color Pulse: ";
  colorPulseLabel.style.display = "block";
  colorPulseLabel.style.marginTop = "10px";

  const colorPulseValue = document.createElement("span");
  colorPulseValue.id = "colorPulseValue";
  colorPulseValue.textContent = "0";
  colorPulseLabel.appendChild(colorPulseValue);

  const colorPulseSlider = document.createElement("input");
  colorPulseSlider.id = "colorPulseSlider";
  colorPulseSlider.type = "range";
  colorPulseSlider.min = "0";
  colorPulseSlider.max = "10";
  colorPulseSlider.step = "1";
  colorPulseSlider.value = "0";

  uiContainer.appendChild(colorPulseLabel);
  uiContainer.appendChild(colorPulseSlider);

  // Add motion wave slider
  const motionWaveLabel = document.createElement("label");
  motionWaveLabel.textContent = "Motion Wave: ";
  motionWaveLabel.style.display = "block";
  motionWaveLabel.style.marginTop = "10px";

  const motionWaveValue = document.createElement("span");
  motionWaveValue.id = "motionWaveValue";
  motionWaveValue.textContent = "0";
  motionWaveLabel.appendChild(motionWaveValue);

  const motionWaveSlider = document.createElement("input");
  motionWaveSlider.id = "motionWaveSlider";
  motionWaveSlider.type = "range";
  motionWaveSlider.min = "0";
  motionWaveSlider.max = "10";
  motionWaveSlider.step = "1";
  motionWaveSlider.value = "0";

  uiContainer.appendChild(motionWaveLabel);
  uiContainer.appendChild(motionWaveSlider);

  // Add motion reverse toggle
  const motionReverseLabel = document.createElement("label");
  motionReverseLabel.textContent = "Reverse Direction: ";
  motionReverseLabel.style.display = "block";
  motionReverseLabel.style.marginTop = "10px";

  const motionReverseToggle = document.createElement("input");
  motionReverseToggle.id = "motionReverseToggle";
  motionReverseToggle.type = "checkbox";
  motionReverseToggle.checked = false;

  motionReverseLabel.appendChild(motionReverseToggle);
  uiContainer.appendChild(motionReverseLabel);

  // Add color saturation slider
  const colorSaturationLabel = document.createElement("label");
  colorSaturationLabel.textContent = "Color Saturation: ";
  colorSaturationLabel.style.display = "block";
  colorSaturationLabel.style.marginTop = "10px";

  const colorSaturationValue = document.createElement("span");
  colorSaturationValue.id = "colorSaturationValue";
  colorSaturationValue.textContent = "100";
  colorSaturationLabel.appendChild(colorSaturationValue);

  const colorSaturationSlider = document.createElement("input");
  colorSaturationSlider.id = "colorSaturationSlider";
  colorSaturationSlider.type = "range";
  colorSaturationSlider.min = "1";
  colorSaturationSlider.max = "200";
  colorSaturationSlider.step = "5";
  colorSaturationSlider.value = "100";

  uiContainer.appendChild(colorSaturationLabel);
  uiContainer.appendChild(colorSaturationSlider);

  // Add color indicator
  const colorIndicator = document.createElement("div");
  colorIndicator.id = "colorIndicator";
  colorIndicator.style.height = "20px";
  colorIndicator.style.marginTop = "10px";
  colorIndicator.style.borderRadius = "3px";
  colorIndicator.style.background = colorSchemeStyles[0];
  uiContainer.appendChild(colorIndicator);

  // Wire up UI controls
  speedSlider.addEventListener("input", () => {
    const value = parseFloat(speedSlider.value);
    (window as any).speed = value;
    speedValue.textContent = value.toFixed(1);
  });

  colorShiftToggle.addEventListener("change", () => {
    (window as any).colorShift = colorShiftToggle.checked ? 1 : 0;
  });

  colorSchemeSelect.addEventListener("change", () => {
    const value = parseInt(colorSchemeSelect.value);
    (window as any).colorScheme = value;
    colorIndicator.style.background = colorSchemeStyles[value];
  });

  effectStyleSelect.addEventListener("change", () => {
    const value = parseInt(effectStyleSelect.value);
    (window as any).effectStyle = value;
  });

  colorIntensitySlider.addEventListener("input", () => {
    const value = parseInt(colorIntensitySlider.value);
    (window as any).colorIntensity = value;
    colorIntensityValue.textContent = value.toString();
  });

  colorPulseSlider.addEventListener("input", () => {
    const value = parseInt(colorPulseSlider.value);
    (window as any).colorPulse = value;
    colorPulseValue.textContent = value.toString();
  });

  motionWaveSlider.addEventListener("input", () => {
    const value = parseInt(motionWaveSlider.value);
    (window as any).motionWave = value;
    motionWaveValue.textContent = value.toString();
  });

  motionReverseToggle.addEventListener("change", () => {
    (window as any).motionReverse = motionReverseToggle.checked ? 1 : 0;
  });

  colorSaturationSlider.addEventListener("input", () => {
    const value = parseInt(colorSaturationSlider.value);
    (window as any).colorSaturation = value;
    colorSaturationValue.textContent = value.toString();
  });

  // FPS counter update
  function updateFPS() {
    frameCount++;
    const now = performance.now();

    if (now - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;

      if (fpsCounter) {
        fpsCounter.textContent = `${fps} FPS`;
      }
    }

    requestAnimationFrame(updateFPS);
  }

  // Start FPS counter
  updateFPS();
}

// Function to create UI for Simple Wave
function createSimpleWaveUI() {
  // FPS tracking
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 0;

  const canvas = document.getElementById("exCanvas") as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  // Create UI container
  const uiContainer = document.createElement("div");
  uiContainer.style.position = "fixed";
  uiContainer.style.top = "10px";
  uiContainer.style.left = "10px";
  uiContainer.style.padding = "10px";
  uiContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
  uiContainer.style.color = "white";
  uiContainer.style.fontFamily = "Arial, sans-serif";
  uiContainer.style.borderRadius = "5px";
  uiContainer.style.zIndex = "1000";
  document.body.appendChild(uiContainer);

  // Add FPS counter
  const fpsCounter = document.createElement("div");
  fpsCounter.id = "fpsCounter";
  fpsCounter.textContent = "-- FPS";
  uiContainer.appendChild(fpsCounter);

  // Add speed slider
  const speedLabel = document.createElement("label");
  speedLabel.textContent = "Speed: ";
  speedLabel.style.display = "block";
  speedLabel.style.marginTop = "10px";

  const speedValue = document.createElement("span");
  speedValue.id = "speedValue";
  speedValue.textContent = "5";
  speedLabel.appendChild(speedValue);

  const speedSlider = document.createElement("input");
  speedSlider.id = "speedSlider";
  speedSlider.type = "range";
  speedSlider.min = "1";
  speedSlider.max = "10";
  speedSlider.step = "1";
  speedSlider.value = "5";

  uiContainer.appendChild(speedLabel);
  uiContainer.appendChild(speedSlider);

  // Add wave count slider
  const waveCountLabel = document.createElement("label");
  waveCountLabel.textContent = "Wave Count: ";
  waveCountLabel.style.display = "block";
  waveCountLabel.style.marginTop = "10px";

  const waveCountValue = document.createElement("span");
  waveCountValue.id = "waveCountValue";
  waveCountValue.textContent = "5";
  waveCountLabel.appendChild(waveCountValue);

  const waveCountSlider = document.createElement("input");
  waveCountSlider.id = "waveCountSlider";
  waveCountSlider.type = "range";
  waveCountSlider.min = "1";
  waveCountSlider.max = "20";
  waveCountSlider.step = "1";
  waveCountSlider.value = "5";

  uiContainer.appendChild(waveCountLabel);
  uiContainer.appendChild(waveCountSlider);

  // Add color mode selector
  const colorModeLabel = document.createElement("label");
  colorModeLabel.textContent = "Color Mode: ";
  colorModeLabel.style.display = "block";
  colorModeLabel.style.marginTop = "10px";

  const colorModeSelect = document.createElement("select");
  colorModeSelect.id = "colorMode";

  const colorModes = ["Rainbow", "Ocean", "Fire", "Neon", "Mono"];
  colorModes.forEach((mode, index) => {
    const optElement = document.createElement("option");
    optElement.value = index.toString();
    optElement.textContent = mode;
    colorModeSelect.appendChild(optElement);
  });

  uiContainer.appendChild(colorModeLabel);
  uiContainer.appendChild(colorModeSelect);

  // Add color speed slider
  const colorSpeedLabel = document.createElement("label");
  colorSpeedLabel.textContent = "Color Speed: ";
  colorSpeedLabel.style.display = "block";
  colorSpeedLabel.style.marginTop = "10px";

  const colorSpeedValue = document.createElement("span");
  colorSpeedValue.id = "colorSpeedValue";
  colorSpeedValue.textContent = "3";
  colorSpeedLabel.appendChild(colorSpeedValue);

  const colorSpeedSlider = document.createElement("input");
  colorSpeedSlider.id = "colorSpeedSlider";
  colorSpeedSlider.type = "range";
  colorSpeedSlider.min = "1";
  colorSpeedSlider.max = "10";
  colorSpeedSlider.step = "1";
  colorSpeedSlider.value = "3";

  uiContainer.appendChild(colorSpeedLabel);
  uiContainer.appendChild(colorSpeedSlider);

  // Add reverse direction toggle
  const reverseLabel = document.createElement("label");
  reverseLabel.textContent = "Reverse Direction: ";
  reverseLabel.style.display = "block";
  reverseLabel.style.marginTop = "10px";

  const reverseToggle = document.createElement("input");
  reverseToggle.id = "reverseToggle";
  reverseToggle.type = "checkbox";
  reverseToggle.checked = false;

  reverseLabel.appendChild(reverseToggle);
  uiContainer.appendChild(reverseLabel);

  // Add color intensity slider
  const colorIntensityLabel = document.createElement("label");
  colorIntensityLabel.textContent = "Color Intensity: ";
  colorIntensityLabel.style.display = "block";
  colorIntensityLabel.style.marginTop = "10px";

  const colorIntensityValue = document.createElement("span");
  colorIntensityValue.id = "colorIntensityValue";
  colorIntensityValue.textContent = "100";
  colorIntensityLabel.appendChild(colorIntensityValue);

  const colorIntensitySlider = document.createElement("input");
  colorIntensitySlider.id = "colorIntensitySlider";
  colorIntensitySlider.type = "range";
  colorIntensitySlider.min = "1";
  colorIntensitySlider.max = "200";
  colorIntensitySlider.step = "5";
  colorIntensitySlider.value = "100";

  uiContainer.appendChild(colorIntensityLabel);
  uiContainer.appendChild(colorIntensitySlider);

  // Add wave height slider
  const waveHeightLabel = document.createElement("label");
  waveHeightLabel.textContent = "Wave Height: ";
  waveHeightLabel.style.display = "block";
  waveHeightLabel.style.marginTop = "10px";

  const waveHeightValue = document.createElement("span");
  waveHeightValue.id = "waveHeightValue";
  waveHeightValue.textContent = "50%";
  waveHeightLabel.appendChild(waveHeightValue);

  const waveHeightSlider = document.createElement("input");
  waveHeightSlider.id = "waveHeightSlider";
  waveHeightSlider.type = "range";
  waveHeightSlider.min = "1";
  waveHeightSlider.max = "100";
  waveHeightSlider.step = "1";
  waveHeightSlider.value = "50";

  uiContainer.appendChild(waveHeightLabel);
  uiContainer.appendChild(waveHeightSlider);

  // Wire up UI controls
  speedSlider.addEventListener("input", () => {
    const value = parseInt(speedSlider.value);
    (window as any).speed = value;
    speedValue.textContent = value.toString();
  });

  waveCountSlider.addEventListener("input", () => {
    const value = parseInt(waveCountSlider.value);
    (window as any).waveCount = value;
    waveCountValue.textContent = value.toString();
  });

  colorModeSelect.addEventListener("change", () => {
    const value = parseInt(colorModeSelect.value);
    (window as any).colorMode = value;
  });

  colorSpeedSlider.addEventListener("input", () => {
    const value = parseInt(colorSpeedSlider.value);
    (window as any).colorSpeed = value;
    colorSpeedValue.textContent = value.toString();
  });

  reverseToggle.addEventListener("change", () => {
    (window as any).reverseDirection = reverseToggle.checked ? 1 : 0;
  });

  colorIntensitySlider.addEventListener("input", () => {
    const value = parseInt(colorIntensitySlider.value);
    (window as any).colorIntensity = value;
    colorIntensityValue.textContent = value.toString();
  });

  waveHeightSlider.addEventListener("input", () => {
    const value = parseInt(waveHeightSlider.value);
    (window as any).waveHeight = value;
    waveHeightValue.textContent = `${value}%`;
  });

  // FPS counter update
  function updateFPS() {
    frameCount++;
    const now = performance.now();

    if (now - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;

      if (fpsCounter) {
        fpsCounter.textContent = `${fps} FPS`;
      }
    }

    requestAnimationFrame(updateFPS);
  }

  // Start FPS counter
  updateFPS();
}

// Import the selected effect's entry point
if (effectId === "puff-stuff") {
  import("./effects/puff-stuff/main");
} else if (effectId === "simple-wave") {
  import("./effects/simple-wave/main");
}
