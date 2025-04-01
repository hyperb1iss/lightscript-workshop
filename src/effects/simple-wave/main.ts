import * as THREE from 'three';
import { 
  createDebugLogger, 
  initializeWebGL, 
  createShaderQuad, 
  startAnimationLoop,
  createStandardUniforms,
  initializeEffect,
  WebGLContext,
  normalizeSpeed,
  normalizePercentage,
  boolToInt
} from '../../common';

// Create a debug logger for this effect
const debug = createDebugLogger('SimpleWave', true);

// Log initialization immediately
debug('Script loaded', { timestamp: new Date().toISOString() });

// WebGL context and objects
let webGLContext: WebGLContext;
let material: THREE.ShaderMaterial;

// Controls interface
export interface Controls {
  speed: number;
  waveCount: number;
  colorMode: number;
  colorSpeed: number;
  reverseDirection: boolean;
  colorIntensity: number;
  waveHeight: number;
}

// Make an update function globally available
// This will update the shader uniforms from the global variables
(window as any).update = function(force = false) {
  // Only log on forced updates or occasionally to reduce spam
  if (force || Math.random() < 0.01) {
    debug('Update called');
  }
  
  if (!material) {
    if (force) debug('Material not initialized yet in update()');
    return;
  }
  
  // Access variables directly from global scope
  const globalSpeed = normalizeSpeed((window as any).speed || 5);
  const globalWaveCount = Number((window as any).waveCount || 5);
  
  // Handle string/number for colorMode
  let globalColorMode = (window as any).colorMode;
  if (typeof globalColorMode === 'string') {
    const modes = ["Rainbow", "Ocean", "Fire", "Neon", "Mono"];
    globalColorMode = modes.indexOf(globalColorMode);
    if (globalColorMode === -1) globalColorMode = 0;
  } else {
    globalColorMode = Number(globalColorMode || 0);
  }
  
  const globalColorSpeed = normalizeSpeed((window as any).colorSpeed || 3);
  const globalReverseDirection = boolToInt((window as any).reverseDirection);
  const globalColorIntensity = normalizePercentage((window as any).colorIntensity || 100);
  const globalWaveHeight = Number((window as any).waveHeight || 50) / 100;
  
  if (force) {
    debug('Control values:', { 
      speed: globalSpeed, 
      waveCount: globalWaveCount, 
      colorMode: globalColorMode, 
      colorSpeed: globalColorSpeed,
      reverseDirection: globalReverseDirection,
      colorIntensity: globalColorIntensity,
      waveHeight: globalWaveHeight
    });
  }
  
  // Update shader uniforms
  material.uniforms.iSpeed.value = globalSpeed;
  material.uniforms.iWaveCount.value = globalWaveCount;
  material.uniforms.iColorMode.value = globalColorMode;
  material.uniforms.iColorSpeed.value = globalColorSpeed;
  material.uniforms.iReverseDirection.value = globalReverseDirection === 1;
  material.uniforms.iColorIntensity.value = globalColorIntensity;
  material.uniforms.iWaveHeight.value = globalWaveHeight;
};

// Initialize everything
function initWebGLEffect() {
  debug('Initializing Simple Wave effect');
  
  try {
    // Check for existing canvas
    const existingCanvas = document.getElementById('exCanvas');
    if (!existingCanvas) {
      console.error('Canvas element with ID "exCanvas" not found. Cannot initialize effect.');
      return;
    }
    
    // Use our common WebGL initialization function
    webGLContext = initializeWebGL({
      canvasId: 'exCanvas',
      canvasWidth: 320,
      canvasHeight: 200,
      antialias: false
    });
    
    const { canvas, scene } = webGLContext;
    
    // Ensure canvas is visible
    canvas.style.display = 'block';
    
    debug(`Renderer initialized with canvas size: ${canvas.width}x${canvas.height}`);
    
    // Create standard uniforms
    const uniforms = {
      ...createStandardUniforms(canvas),
      // Additional uniforms specific to this effect
      iSpeed: { value: 1.0 },
      iWaveCount: { value: 5.0 },
      iColorMode: { value: 0 },
      iColorSpeed: { value: 1.0 },
      iReverseDirection: { value: false },
      iColorIntensity: { value: 1.0 },
      iWaveHeight: { value: 0.5 }
    };
    
    // Simple wave fragment shader
    const fragmentShader = `
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float iSpeed;
      uniform float iWaveCount;
      uniform int iColorMode;
      uniform float iColorSpeed;
      uniform bool iReverseDirection;
      uniform float iColorIntensity;
      uniform float iWaveHeight;
      
      // HSV to RGB conversion
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      // Color mode functions
      vec3 getRainbow(float pos) {
        return hsv2rgb(vec3(pos, 0.8, 1.0));
      }
      
      vec3 getOcean(float pos) {
        return mix(
          vec3(0.0, 0.3, 0.8),
          vec3(0.0, 0.8, 1.0),
          sin(pos * 6.28) * 0.5 + 0.5
        );
      }
      
      vec3 getFire(float pos) {
        return mix(
          vec3(1.0, 0.5, 0.0),
          vec3(1.0, 0.2, 0.0),
          sin(pos * 6.28) * 0.5 + 0.5
        );
      }
      
      vec3 getNeon(float pos) {
        float segment = floor(pos * 4.0) / 4.0;
        float t = fract(pos * 4.0);
        
        if (segment < 0.25) {
          return mix(vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), t);
        } else if (segment < 0.5) {
          return mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), t);
        } else if (segment < 0.75) {
          return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.5), t);
        } else {
          return mix(vec3(1.0, 0.0, 0.5), vec3(1.0, 0.0, 1.0), t);
        }
      }
      
      vec3 getMono(float pos) {
        return vec3(0.7 + 0.3 * sin(pos * 6.28));
      }
      
      vec3 getColorForMode(float pos, int mode) {
        if (mode == 1) return getOcean(pos);
        if (mode == 2) return getFire(pos);
        if (mode == 3) return getNeon(pos);
        if (mode == 4) return getMono(pos);
        return getRainbow(pos); // default
      }
      
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        // Normalized coordinates
        vec2 uv = fragCoord / iResolution.xy;
        
        // Direction handling
        float direction = iReverseDirection ? -1.0 : 1.0;
        
        // Time-based motion
        float time = iTime * iSpeed * direction;
        
        // Create wave
        float waves = iWaveCount;
        float wave = sin(uv.x * 6.28 * waves + time) * 0.5 + 0.5;
        
        // Apply wave height
        wave = wave * iWaveHeight;
        
        // Use position for color
        float colorPos = (uv.x + time * iColorSpeed * 0.1) * 0.5;
        colorPos = fract(colorPos); // Loop colors
        
        // Get color based on selected mode
        vec3 color = getColorForMode(colorPos, iColorMode);
        
        // Apply wave and intensity
        float intensity = mix(0.1, 1.0, iColorIntensity); // Ensure some color even at low intensity
        
        // Calculate the threshold based on wave and y position
        float threshold = wave;
        
        // Light pixels if they're below the wave threshold
        if (uv.y < threshold) {
          fragColor = vec4(color * intensity, 1.0);
        } else {
          // Everything above the wave is dark
          fragColor = vec4(vec3(0.0), 1.0);
        }
      }
      
      void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `;

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // Create shader mesh and material using our common utility
    const { mesh, material: shaderMaterial } = createShaderQuad(
      fragmentShader,
      uniforms,
      vertexShader
    );
    
    // Store material for global updates
    material = shaderMaterial;
    
    debug('Shader material created');

    // Add mesh to scene
    scene.add(mesh);
    debug('Mesh added to scene');

    // Make initial update call to ensure all controls are applied
    (window as any).update(true);

    // Start animation loop using our common utility
    debug('Starting animation loop');
    
    startAnimationLoop(webGLContext, material, (time) => {
      // Update to catch any control changes from SignalRGB
      if (time % 0.1 < 0.02) { // Less frequent updates 
        (window as any).update();
      }
      
      // Log occasionally to avoid flooding the console
      if (time % 10 < 0.1) {
        debug('Animation frame', { time: time.toFixed(2) });
      }
    });
    
    debug('Initialization complete');
    
  } catch (error) {
    debug('ERROR during initialization:', error);
    console.error('Failed to initialize WebGL effect:', error);
    
    // Try to display error message on canvas
    try {
      const canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'red';
          ctx.font = '14px Arial';
          ctx.fillText('Error initializing effect', 20, 50);
          ctx.fillText(String(error).substring(0, 40), 20, 70);
        }
      }
    } catch (e) {
      // If even this fails, just log it
      console.error('Could not display error message:', e);
    }
  }
}

// Wait a moment to ensure the DOM is ready before initializing 
setTimeout(() => {
  initializeEffect(initWebGLEffect);
}, 10);

// Also trigger initialization on window load just to be safe
window.addEventListener('load', () => {
  if (!material) {
    debug('Initializing on window load event');
    initializeEffect(initWebGLEffect);
  }
}); 