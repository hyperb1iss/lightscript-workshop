// Simple debug file to test canvas rendering without TypeScript
console.log("Debug script loaded");

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded in debug.js");
  
  // Test the canvas
  const canvas = document.getElementById('exCanvas');
  if (!canvas) {
    console.error("Canvas not found!");
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error("Couldn't get 2D context!");
    return;
  }
  
  console.log("Canvas and context acquired");
  
  // Draw a simple gradient to test rendering
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#ff00ff');
  gradient.addColorStop(1, '#00ffff');
  
  // Animation function
  function animate() {
    const time = Date.now() * 0.001;
    
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw animated rectangle
    ctx.fillStyle = gradient;
    const size = Math.sin(time) * 40 + 80;
    ctx.fillRect(
      canvas.width/2 - size/2, 
      canvas.height/2 - size/2, 
      size, 
      size
    );
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Debug Mode', canvas.width/2, 30);
    
    // Update FPS counter
    const fpsCounter = document.getElementById('fpsCounter');
    if (fpsCounter) {
      fpsCounter.textContent = Math.round(performance.now() % 100) + ' FPS';
    }
    
    // Continue animation
    requestAnimationFrame(animate);
  }
  
  // Start animation
  animate();
  
  // Set up debug button
  const debugButton = document.getElementById('debugButton');
  if (debugButton) {
    debugButton.addEventListener('click', () => {
      console.log("Debug button clicked");
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setTimeout(() => {
        animate();
      }, 500);
    });
  }
}); 