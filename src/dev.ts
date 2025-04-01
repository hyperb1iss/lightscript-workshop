// Debug logging
console.log('✨ WebGL Tunnel Test Init ✨');

// Set up global variables for local testing only
// These won't be used in SignalRGB, which sets them via the meta properties
if (typeof (window as any).speed === 'undefined') {
  (window as any).speed = 1;
}

if (typeof (window as any).colorShift === 'undefined') {
  (window as any).colorShift = 1;
}

if (typeof (window as any).colorScheme === 'undefined') {
  (window as any).colorScheme = 0;
}

if (typeof (window as any).effectStyle === 'undefined') {
  (window as any).effectStyle = 0;
}

// Color scheme to CSS mapping for the indicator
const colorSchemeStyles = [
  "linear-gradient(135deg, #3b83ff, #0052cc)", // Classic Blue
  "linear-gradient(135deg, #9d4edd, #5a189a)", // Cyberpunk
  "linear-gradient(135deg, #ff7b00, #ff0000)", // Fire
  "linear-gradient(135deg, #a7f542, #2d801c)", // Toxic 
  "linear-gradient(135deg, #caf0f8, #9381ff)", // Ethereal
  "linear-gradient(135deg, #ffffff, #333333)", // Monochrome
  "linear-gradient(135deg, #ff0000, #00ff00, #0000ff)", // Rainbow
  "linear-gradient(135deg, #00d4ff, #090979)" // Electric
];

// FPS tracking
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

// Import main script to run WebGL effect
// This is necessary because we're just setting up UI here
import './main';

// Create local testing UI when running in a browser (not SignalRGB)
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, setting up local testing UI');
  
  // Only run this setup if we're in a browser context with a body element
  // SignalRGB might not have a complete DOM or might load things differently
  if (document.body) {
    const canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found!');
      return;
    }
    
    // Create UI container
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'fixed';
    uiContainer.style.top = '10px';
    uiContainer.style.left = '10px';
    uiContainer.style.padding = '10px';
    uiContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    uiContainer.style.color = 'white';
    uiContainer.style.fontFamily = 'Arial, sans-serif';
    uiContainer.style.borderRadius = '5px';
    uiContainer.style.zIndex = '1000';
    document.body.appendChild(uiContainer);
    
    // Add FPS counter
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fpsCounter';
    fpsCounter.textContent = '-- FPS';
    uiContainer.appendChild(fpsCounter);
    
    // Add speedSlider
    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Speed: ';
    speedLabel.style.display = 'block';
    speedLabel.style.marginTop = '10px';
    
    const speedValue = document.createElement('span');
    speedValue.id = 'speedValue';
    speedValue.textContent = '1.0';
    speedLabel.appendChild(speedValue);
    
    const speedSlider = document.createElement('input');
    speedSlider.id = 'speedSlider';
    speedSlider.type = 'range';
    speedSlider.min = '0.1';
    speedSlider.max = '5';
    speedSlider.step = '0.1';
    speedSlider.value = '1';
    
    uiContainer.appendChild(speedLabel);
    uiContainer.appendChild(speedSlider);
    
    // Add colorShift toggle
    const colorShiftLabel = document.createElement('label');
    colorShiftLabel.textContent = 'Color Shift: ';
    colorShiftLabel.style.display = 'block';
    colorShiftLabel.style.marginTop = '10px';
    
    const colorShiftToggle = document.createElement('input');
    colorShiftToggle.id = 'colorShiftToggle';
    colorShiftToggle.type = 'checkbox';
    colorShiftToggle.checked = true;
    
    colorShiftLabel.appendChild(colorShiftToggle);
    uiContainer.appendChild(colorShiftLabel);
    
    // Add color scheme selector
    const colorSchemeLabel = document.createElement('label');
    colorSchemeLabel.textContent = 'Color Scheme: ';
    colorSchemeLabel.style.display = 'block';
    colorSchemeLabel.style.marginTop = '10px';
    
    const colorSchemeSelect = document.createElement('select');
    colorSchemeSelect.id = 'colorScheme';
    
    const schemeOptions = ['Classic Blue', 'Cyberpunk', 'Fire', 'Toxic', 'Ethereal', 'Monochrome', 'Rainbow', 'Electric'];
    schemeOptions.forEach((option, index) => {
      const optElement = document.createElement('option');
      optElement.value = index.toString();
      optElement.textContent = option;
      colorSchemeSelect.appendChild(optElement);
    });
    
    uiContainer.appendChild(colorSchemeLabel);
    uiContainer.appendChild(colorSchemeSelect);
    
    // Add effect style selector
    const effectStyleLabel = document.createElement('label');
    effectStyleLabel.textContent = 'Effect Style: ';
    effectStyleLabel.style.display = 'block';
    effectStyleLabel.style.marginTop = '10px';
    
    const effectStyleSelect = document.createElement('select');
    effectStyleSelect.id = 'effectStyle';
    
    const styleOptions = ['Standard', 'Wireframe', 'Glitch', 'Hologram', 'Film Noir'];
    styleOptions.forEach((option, index) => {
      const optElement = document.createElement('option');
      optElement.value = index.toString();
      optElement.textContent = option;
      effectStyleSelect.appendChild(optElement);
    });
    
    uiContainer.appendChild(effectStyleLabel);
    uiContainer.appendChild(effectStyleSelect);
    
    // Add color indicator
    const colorIndicator = document.createElement('div');
    colorIndicator.id = 'colorIndicator';
    colorIndicator.style.height = '20px';
    colorIndicator.style.marginTop = '10px';
    colorIndicator.style.borderRadius = '3px';
    colorIndicator.style.background = colorSchemeStyles[0];
    uiContainer.appendChild(colorIndicator);
    
    // Wire up UI controls
    speedSlider.addEventListener('input', () => {
      const value = parseFloat(speedSlider.value);
      (window as any).speed = value;
      speedValue.textContent = value.toFixed(1);
    });
    
    colorShiftToggle.addEventListener('change', () => {
      (window as any).colorShift = colorShiftToggle.checked ? 1 : 0;
    });
    
    colorSchemeSelect.addEventListener('change', () => {
      const value = parseInt(colorSchemeSelect.value);
      (window as any).colorScheme = value;
      colorIndicator.style.background = colorSchemeStyles[value];
    });
    
    effectStyleSelect.addEventListener('change', () => {
      const value = parseInt(effectStyleSelect.value);
      (window as any).effectStyle = value;
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
}); 