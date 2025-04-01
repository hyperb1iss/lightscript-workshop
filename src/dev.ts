import * as THREE from 'three';
import { Controls } from './main';

// Debug logging
console.log('✨ WebGL Tunnel initialized ✨');

// Declare global variables that would normally be set by SignalRGB
declare global {
  interface Window {
    speed: number;
    colorShift: number;
    colorScheme: number;
    effectStyle: number;
  }
}

// Set initial values on window
window.speed = 1;
window.colorShift = 1;
window.colorScheme = 0;
window.effectStyle = 0;

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

// Create effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  // Get UI elements
  const canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
  const fpsCounter = document.getElementById('fpsCounter');
  const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
  const colorShiftToggle = document.getElementById('colorShiftToggle') as HTMLInputElement;
  const colorSchemeSelect = document.getElementById('colorScheme') as HTMLSelectElement;
  const effectStyleSelect = document.getElementById('effectStyle') as HTMLSelectElement;
  const speedValue = document.getElementById('speedValue');
  const colorIndicator = document.getElementById('colorIndicator');
  
  console.log('Canvas:', !!canvas);
  console.log('FPS Counter:', !!fpsCounter);
  console.log('Controls:', {
    speedSlider: !!speedSlider,
    colorShiftToggle: !!colorShiftToggle,
    colorSchemeSelect: !!colorSchemeSelect,
    effectStyleSelect: !!effectStyleSelect
  });
  
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  // Update color indicator
  const updateColorIndicator = (scheme: number) => {
    if (colorIndicator) {
      colorIndicator.style.background = colorSchemeStyles[scheme];
    }
  };
  
  // Set initial color indicator
  updateColorIndicator(0);
  
  // Set up UI controls
  speedSlider.addEventListener('input', () => {
    const value = parseFloat(speedSlider.value);
    window.speed = value;
    if (speedValue) speedValue.textContent = value.toFixed(1);
  });
  
  colorShiftToggle.addEventListener('change', () => {
    window.colorShift = colorShiftToggle.checked ? 1 : 0;
  });
  
  colorSchemeSelect.addEventListener('change', () => {
    const value = parseInt(colorSchemeSelect.value);
    window.colorScheme = value;
    updateColorIndicator(value);
  });
  
  effectStyleSelect.addEventListener('change', () => {
    const value = parseInt(effectStyleSelect.value);
    window.effectStyle = value;
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
}); 