import { PuffStuffEffect, Controls } from './puff-stuff';
import { vec3 } from 'gl-matrix';

// Debug logging
console.log('✨ Dev script loaded ✨');

// Test gl-matrix
try {
  const v = vec3.create();
  vec3.set(v, 1, 2, 3);
  console.log('gl-matrix test:', v);
} catch (e) {
  console.error('gl-matrix error:', e);
}

// Declare global variables that would normally be set by SignalRGB
declare global {
  interface Window {
    speed: number;
    detail: number;
    colorShift: number;
  }
}

// Set initial values on window
window.speed = 1;
window.detail = 2;
window.colorShift = 1;

// FPS tracking
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

// Immediately check if canvas exists in the DOM
const canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
console.log('Canvas element found:', !!canvas);

// Create effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  // Get UI elements
  const canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
  const fpsCounter = document.getElementById('fpsCounter');
  const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
  const detailSlider = document.getElementById('detailSlider') as HTMLInputElement;
  const colorShiftToggle = document.getElementById('colorShiftToggle') as HTMLInputElement;
  const speedValue = document.getElementById('speedValue');
  const detailValue = document.getElementById('detailValue');
  
  console.log('Canvas:', !!canvas);
  console.log('FPS Counter:', !!fpsCounter);
  console.log('Controls:', {
    speedSlider: !!speedSlider,
    detailSlider: !!detailSlider,
    colorShiftToggle: !!colorShiftToggle
  });
  
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  // Set up UI controls
  speedSlider.addEventListener('input', () => {
    const value = parseFloat(speedSlider.value);
    window.speed = value;
    if (speedValue) speedValue.textContent = value.toFixed(1);
  });
  
  detailSlider.addEventListener('input', () => {
    const value = parseInt(detailSlider.value);
    window.detail = value;
    if (detailValue) detailValue.textContent = value.toString();
  });
  
  colorShiftToggle.addEventListener('change', () => {
    window.colorShift = colorShiftToggle.checked ? 1 : 0;
  });
  
  // Get control values from UI elements
  const getControls = (): Controls => {
    return {
      speed: window.speed,
      detail: window.detail,
      colorShift: window.colorShift !== 0
    };
  };
  
  try {
    console.log('Creating PuffStuffEffect...');
    // Create effect
    const effect = new PuffStuffEffect(canvas);
    console.log('Effect created successfully');
    
    // Animation loop with FPS counter
    const animate = (timestamp: number) => {
      // Track FPS
      frameCount++;
      if (timestamp - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (timestamp - lastTime));
        frameCount = 0;
        lastTime = timestamp;
        if (fpsCounter) fpsCounter.textContent = `${fps} FPS`;
      }
      
      // Get current time in seconds
      const time = timestamp * 0.001;
      
      // Get current controls
      const controls = getControls();
      
      try {
        // Render frame
        effect.render(time, controls);
      } catch (e) {
        console.error('Render error:', e);
      }
      
      // Request next frame
      window.requestAnimationFrame(animate);
    };
    
    // Start animation
    console.log('Starting animation loop');
    window.requestAnimationFrame(animate);
  } catch (e) {
    console.error('Error setting up effect:', e);
  }
}); 