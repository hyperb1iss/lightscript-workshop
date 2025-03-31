import { PuffStuffEffect, Controls } from './puff-stuff';

// Create effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get the canvas element
  const canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
  if (!canvas) return;
  
  // Get control values from global window object
  // These are set by SignalRGB
  const getControls = (): Controls => {
    return {
      speed: (window as any).speed || 1,
      detail: (window as any).detail || 2,
      colorShift: (window as any).colorShift !== 0
    };
  };
  
  // Create effect
  const effect = new PuffStuffEffect(canvas);
  
  // Animation loop
  const animate = (timestamp: number) => {
    // Get current time in seconds
    const time = timestamp * 0.001;
    
    // Get current controls
    const controls = getControls();
    
    // Render frame
    effect.render(time, controls);
    
    // Request next frame
    window.requestAnimationFrame(animate);
  };
  
  // Start animation
  window.requestAnimationFrame(animate);
});

// Make sure to add this to the window object for the signal-rgb app to access
(window as any).update = () => {
  // This is required for SignalRGB to trigger updates
  // Our effect uses requestAnimationFrame instead
}; 