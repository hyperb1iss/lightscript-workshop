import * as THREE from 'three';

// Canvas and renderer setup
let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.Camera;
let material: THREE.ShaderMaterial;
let clock: THREE.Clock;

// Log initialization
console.log('Main WebGL module loaded');

// Controls interface
export interface Controls {
  speed: number;
  colorShift: boolean;
  colorScheme: number;
  effectStyle: number;
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Main WebGL: DOM loaded, initializing WebGL');
  
  // Get the canvas element
  canvas = document.getElementById('exCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }

  // Create renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(canvas.width, canvas.height);
  console.log(`Renderer initialized with canvas size: ${canvas.width}x${canvas.height}`);

  // Create scene and camera (orthographic for fullscreen quad)
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create a full-screen quad for the shader
  const geometry = new THREE.PlaneGeometry(2, 2);

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

  // Create mesh with geometry and material
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Initialize clock for time tracking
  clock = new THREE.Clock();

  // Start render loop
  animate();

  // Add mouse tracking
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    material.uniforms.iMouse.value.x = event.clientX - rect.left;
    material.uniforms.iMouse.value.y = event.clientY - rect.top;
  });

  // Make canvas responsive
  window.addEventListener('resize', () => {
    if (canvas.parentElement) {
      const width = canvas.parentElement.clientWidth;
      const height = canvas.parentElement.clientHeight;
      
      if (width > 0 && height > 0) {
        renderer.setSize(width, height);
        material.uniforms.iResolution.value.set(width, height);
      }
    }
  });
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update time uniform
  material.uniforms.iTime.value = clock.getElapsedTime();
  
  // Update controls from global variables (for SignalRGB compatibility)
  material.uniforms.iSpeed.value = (window as any).speed || 1.0;
  material.uniforms.iColorShift.value = (window as any).colorShift !== 0;
  material.uniforms.iColorScheme.value = (window as any).colorScheme || 0;
  material.uniforms.iEffectStyle.value = (window as any).effectStyle || 0;
  
  // Render the scene
  renderer.render(scene, camera);
}

// Expose update function for SignalRGB
(window as any).update = () => {
  // SignalRGB will call this, but we're using requestAnimationFrame
}; 