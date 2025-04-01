import * as THREE from 'three';

// Debug flag - set to false to disable debug logging
const DEBUG = true;

// Helper debug function
function debug(...args: any[]) {
  if (DEBUG) {
    console.log('[PuffStuff]', ...args);
  }
}

// Log initialization immediately
debug('Script loaded', { timestamp: new Date().toISOString() });

// Canvas and renderer setup
let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.Camera;
let material: THREE.ShaderMaterial;
let clock: THREE.Clock;
let isInitialized = false;

// Controls interface
export interface Controls {
  speed: number;
  colorShift: boolean;
  colorScheme: number;
  effectStyle: number;
}

// Make an update function globally available
// This will update the shader uniforms from the global variables
(window as any).update = function(force = false) {
  // Only log on forced updates or occasionally to reduce spam
  if (force || Math.random() < 0.01) {
    debug('Update called');
  }
  
  if (!material) {
    debug('Material not initialized yet in update()');
    return;
  }
  
  // Access variables directly from global scope
  // These come from SignalRGB's meta properties
  const globalSpeed = (window as any).speed || 1.0;
  const globalColorShift = (window as any).colorShift ? 1 : 0;
  
  // Handle both string and number values for colorScheme and effectStyle
  let globalColorScheme = (window as any).colorScheme;
  let globalEffectStyle = (window as any).effectStyle;
  
  // Convert string values to indices if needed (for SignalRGB)
  if (typeof globalColorScheme === 'string') {
    const schemes = ["Classic Blue", "Cyberpunk", "Fire", "Toxic", "Ethereal", "Monochrome", "Rainbow", "Electric"];
    globalColorScheme = schemes.indexOf(globalColorScheme);
    if (globalColorScheme === -1) globalColorScheme = 0;
  }
  
  if (typeof globalEffectStyle === 'string') {
    const styles = ["Standard", "Wireframe", "Glitch", "Hologram", "Film Noir"];
    globalEffectStyle = styles.indexOf(globalEffectStyle);
    if (globalEffectStyle === -1) globalEffectStyle = 0;
  }
  
  // Ensure we have numeric values
  globalColorScheme = Number(globalColorScheme) || 0;
  globalEffectStyle = Number(globalEffectStyle) || 0;
  
  if (force) {
    debug('Control values:', { 
      speed: globalSpeed, 
      colorShift: globalColorShift, 
      colorScheme: globalColorScheme, 
      effectStyle: globalEffectStyle 
    });
  }
  
  // Update shader uniforms
  material.uniforms.iSpeed.value = globalSpeed;
  material.uniforms.iColorShift.value = globalColorShift === 1;
  material.uniforms.iColorScheme.value = globalColorScheme;
  material.uniforms.iEffectStyle.value = globalEffectStyle;
};

// Initialize everything
function initWebGLEffect() {
  debug('Initializing WebGL tunnel effect');
  
  try {
    // Get the canvas element
    canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
    if (!canvas) {
      debug('Canvas not found!');
      // Try creating one if it doesn't exist
      canvas = document.createElement('canvas');
      canvas.id = 'exCanvas';
      canvas.width = 320;
      canvas.height = 200;
      document.body.appendChild(canvas);
      debug('Created canvas element dynamically');
    } else {
      debug('Found canvas:', { 
        width: canvas.width, 
        height: canvas.height 
      });
    }

    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(canvas.width, canvas.height);
    debug(`Renderer initialized with canvas size: ${canvas.width}x${canvas.height}`);

    // Create scene and camera (orthographic for fullscreen quad)
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    debug('Scene and camera initialized');

    // Create a full-screen quad for the shader
    const geometry = new THREE.PlaneGeometry(2, 2);
    debug('Created geometry');

    // Shadertoy-compatible shader
    const fragmentShader = `
      uniform float iTime;
      uniform vec2 iResolution;
      uniform vec2 iMouse;
      uniform float iSpeed;
      uniform bool iColorShift;
      uniform int iColorScheme;
      uniform int iEffectStyle;
      
      #define T (iTime*3.5*iSpeed)
      #define P(z) (vec3(tanh(cos((z) * .2) * .4) * 12., \
                      5.+tanh(cos((z) * .14) * .5) * 24., (z)))
      #define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))
      #define N normalize
      
      // See "Xyptonjtroz" by nimitz
      // https://www.shadertoy.com/view/4ts3z2
      vec3 tri(in vec3 x){return abs(x-floor(x)-.5);}
      
      vec3 rgb = vec3(0);
      
      // Color scheme palettes
      vec3 getColorPalette(int scheme, vec3 baseColor) {
          // Default blue palette (original)
          vec3 color = baseColor * vec3(.3, .6, 1.0);
          
          if (scheme == 1) {
              // Cyberpunk - Purple and teal
              color = baseColor * vec3(0.7, 0.2, 0.8) + vec3(0.0, 0.1, 0.2);
          }
          else if (scheme == 2) {
              // Fire - Red and orange tones
              color = baseColor * vec3(1.0, 0.4, 0.1);
          }
          else if (scheme == 3) {
              // Toxic - Green and yellow hues
              color = baseColor * vec3(0.2, 0.9, 0.3);
          }
          else if (scheme == 4) {
              // Ethereal - Soft pastels
              color = baseColor * vec3(0.6, 0.8, 0.9) + vec3(0.2, 0.0, 0.3);
          }
          else if (scheme == 5) {
              // Monochrome - Grayscale
              float luminance = dot(baseColor, vec3(0.299, 0.587, 0.114));
              color = vec3(luminance * 1.5);
          }
          else if (scheme == 6) {
              // Rainbow - Color cycling based on time
              float hue = iTime * 0.1;
              vec3 rainbow;
              
              // Simple RGB rainbow
              rainbow.r = sin(hue) * 0.5 + 0.5;
              rainbow.g = sin(hue + 2.0) * 0.5 + 0.5;
              rainbow.b = sin(hue + 4.0) * 0.5 + 0.5;
              
              color = baseColor * rainbow + vec3(0.2);
          }
          else if (scheme == 7) {
              // Electric - Blues and whites with high contrast
              color = baseColor * vec3(0.1, 0.4, 1.0) + vec3(0.3 * sin(T * 0.3));
          }
          
          return color;
      }
      
      // Apply visual effects based on style
      vec4 applyEffectStyle(vec4 color, float depth, int style) {
          if (style == 0) {
              // Standard - Original look
              return color;
          }
          else if (style == 1) {
              // Wireframe - Add grid lines
              vec2 grid = fract(gl_FragCoord.xy / 15.0);
              float line = step(0.95, max(grid.x, grid.y)) * 0.3;
              return color + vec4(vec3(line), 0.0);
          }
          else if (style == 2) {
              // Glitch - Digital distortion
              float glitchT = floor(iTime * 5.0) * 0.1;
              float glitch = step(0.95, fract(sin(gl_FragCoord.y * 0.01 + glitchT) * 100.0));
              
              color.rgb = mix(color.rgb, color.rgb * vec3(0.2, 1.0, 1.5), glitch * 0.5);
              
              if (fract(iTime * 3.0) < 0.05) {
                  vec2 offset = vec2(cos(gl_FragCoord.y * 0.01), 0.0) * 2.0;
                  color.rgb += vec3(0.1, 0.0, 0.2) * step(0.95, fract(gl_FragCoord.x * 0.02));
              }
              
              return color;
          }
          else if (style == 3) {
              // Holo - Scan lines and glow
              float scanLine = sin(gl_FragCoord.y * 0.5 + iTime * 10.0) * 0.25 + 0.75;
              color.rgb *= vec3(0.8, 1.0, 1.0) * scanLine;
              
              // Add subtle glow around edges
              color.rgb += vec3(0.1, 0.3, 0.6) * (1.0 - exp(-depth * 0.1));
              
              return color;
          }
          else if (style == 4) {
              // Film grain
              float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
              color.rgb += (grain - 0.5) * 0.1;
              
              // Add vignette
              vec2 uv = gl_FragCoord.xy / iResolution.xy;
              float vignette = smoothstep(1.0, 0.0, length((uv - 0.5) * 1.5));
              color.rgb *= vignette;
              
              return color;
          }
          
          return color;
      }
      
      float triSurface(vec3 p) {
          return (1. -  dot(tri(.15*T+p*.25+tri(.05*T+p*.2))+
                            tri(p)*.2,
                            vec3(2.5)));
      }
      
      float map(vec3 p) {
          float ps,a;
          float s =  1.5 - min(length(p.xy - P(p.z).xy),
                                     (p.y - P(p.z).x));
          s = min(6.5 + p.y, s);
          s -= triSurface(p);
          
          if (!iColorShift) {
              for (a = .05; a < 1.;
                  s -= abs(dot(sin(T+p * a * 40.), vec3(.01))) / a,
                  a += a);
          }
              
          rgb += sin(p)*.15+.175;
          return s;
      }
      
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
          float s=.002,d=0.,i=0.,a;
          vec3  r = vec3(iResolution, 0.0),
                p = P(T),ro=p,
                Z = N( P(T+3.) - p),
                X = N(vec3(Z.z,0,-Z.x)),
                D = vec3(rot(sin(T*.2)*.3) *
                         (fragCoord-r.xy/2.)/r.y, 1) *
                         mat3(-X, cross(X, Z), Z);
          fragColor = vec4(0.0);
          rgb = vec3(0);
          
          while(i++ < 90. && s > .001)
              p = ro + D * d,
              d += s = map(p)*.3;
          
          for (a = .4; a < 4.;
              rgb +=  abs(dot(sin(p* a * 8.),
              vec3(.07))) / a, a *= 1.4142);
          
          // Apply color scheme
          rgb = getColorPalette(iColorScheme, rgb);
          
          vec4 baseColor = vec4(pow(rgb*exp(-d/2.), vec3(.45)), 1.);
          
          // Apply effect style
          fragColor = applyEffectStyle(baseColor, d, iEffectStyle);
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

    // Create shader material
    material = new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
        iMouse: { value: new THREE.Vector2(0, 0) },
        iSpeed: { value: 1.0 },
        iColorShift: { value: true },
        iColorScheme: { value: 0 },
        iEffectStyle: { value: 0 }
      }
    });
    debug('Shader material created');

    // Create mesh with geometry and material
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    debug('Mesh added to scene');

    // Initialize clock for time tracking
    clock = new THREE.Clock();
    debug('Clock initialized');

    // Make initial update call
    (window as any).update();

    // Start render loop
    isInitialized = true;
    debug('Starting animation loop');
    animate();
    
  } catch (error) {
    debug('ERROR during initialization:', error);
    console.error('Failed to initialize WebGL effect:', error);
  }
}

// Animation loop
function animate() {
  if (!isInitialized) {
    debug('Animation called but not initialized');
    return;
  }
  
  try {
    requestAnimationFrame(animate);
    
    // Update time uniform
    const elapsedTime = clock.getElapsedTime();
    material.uniforms.iTime.value = elapsedTime;
    
    if (elapsedTime % 5 < 0.1) {
      // Log occasionally to avoid flooding the console
      debug('Animation frame', { time: elapsedTime.toFixed(2) });
    }
    
    // Force update every frame to catch any control changes from SignalRGB
    // This ensures the controls work even if SignalRGB doesn't trigger events
    (window as any).update();
    
    // Render the scene
    renderer.render(scene, camera);
  } catch (error) {
    debug('ERROR during animation:', error);
    console.error('Animation error:', error);
  }
}

// Start initialization when the script runs
// This is crucial - we need to run the initialization directly,
// not wait for DOMContentLoaded which SignalRGB might not trigger properly
debug('Attempting initialization...');
try {
  // Try immediate initialization
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    debug('Document ready, initializing now');
    initWebGLEffect();
  } else {
    debug('Document not ready, will initialize on load');
    window.addEventListener('load', () => {
      debug('Window load event fired');
      initWebGLEffect();
    });
    
    // Backup: also try with a timeout
    setTimeout(() => {
      if (!isInitialized) {
        debug('Fallback initialization after timeout');
        initWebGLEffect();
      }
    }, 1000);
  }
} catch (error) {
  debug('ERROR during script execution:', error);
  console.error('Failed to start initialization:', error);
} 