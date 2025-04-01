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
  comboboxValueToIndex,
  normalizePercentage,
  boolToInt
} from '../../common';

// Create a debug logger for this effect
const debug = createDebugLogger('PuffStuff', true);

// Log initialization immediately
debug('Script loaded', { timestamp: new Date().toISOString() });

// WebGL context and objects
let webGLContext: WebGLContext;
let material: THREE.ShaderMaterial;

// Controls interface
export interface Controls {
  speed: number;
  colorShift: boolean;
  colorScheme: number;
  effectStyle: number;
  colorIntensity: number;
  colorPulse: number;
  motionWave: number;
  motionReverse: boolean;
  colorSaturation: number;
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
  // These come from SignalRGB's meta properties
  let globalSpeed = (window as any).speed;
  
  // Convert the integer speed (1-10) to a reasonable multiplier (0.2-3.0)
  if (typeof globalSpeed === 'number') {
    // Use normalizeSpeed from common utilities
    globalSpeed = normalizeSpeed(globalSpeed);
  } else {
    globalSpeed = 1.0; // Default
  }
  
  const globalColorShift = boolToInt((window as any).colorShift);
  
  // Handle both string and number values for colorScheme and effectStyle
  let globalColorScheme = (window as any).colorScheme;
  let globalEffectStyle = (window as any).effectStyle;
  
  // Convert string values to indices if needed (for SignalRGB)
  if (typeof globalColorScheme === 'string') {
    const schemes = ["Classic Blue", "Cyberpunk", "Fire", "Toxic", "Ethereal", "Monochrome", "Rainbow", "Electric", 
                    "Amethyst", "Coral Reef", "Deep Sea", "Emerald", "Neon", "Rose Gold", "Sunset", "Vapor Wave"];
    globalColorScheme = comboboxValueToIndex(globalColorScheme, schemes, 0);
  }
  
  if (typeof globalEffectStyle === 'string') {
    const styles = ["Standard", "Wireframe", "Glitch", "Hologram", "Film Noir"];
    globalEffectStyle = comboboxValueToIndex(globalEffectStyle, styles, 0);
  }
  
  // Get new control values
  const globalColorIntensity = Number((window as any).colorIntensity) || 100;
  const globalColorPulse = Number((window as any).colorPulse) || 0;
  const globalMotionWave = Number((window as any).motionWave) || 0;
  const globalMotionReverse = (window as any).motionReverse ? 1 : 0;
  const globalColorSaturation = Number((window as any).colorSaturation) || 100;
  
  // Ensure we have numeric values for color scheme and effect style
  const normalizedColorScheme = Number(globalColorScheme) || 0;
  const normalizedEffectStyle = Number(globalEffectStyle) || 0;
  
  // Use normalizePercentage from common utilities
  const normalizedColorIntensity = normalizePercentage(globalColorIntensity);
  const normalizedColorSaturation = normalizePercentage(globalColorSaturation);
  
  // Normalize other sliders to 0-1 range
  const normalizedColorPulse = globalColorPulse / 10;
  const normalizedMotionWave = globalMotionWave / 10;
  
  if (force) {
    debug('Control values:', { 
      speed: globalSpeed, 
      colorShift: globalColorShift, 
      colorScheme: normalizedColorScheme, 
      effectStyle: normalizedEffectStyle,
      colorIntensity: normalizedColorIntensity,
      colorSaturation: normalizedColorSaturation,
      colorPulse: normalizedColorPulse, 
      motionWave: normalizedMotionWave,
      motionReverse: globalMotionReverse 
    });
  }
  
  // Update shader uniforms
  material.uniforms.iSpeed.value = globalSpeed;
  material.uniforms.iColorShift.value = globalColorShift === 1;
  material.uniforms.iColorScheme.value = normalizedColorScheme;
  material.uniforms.iEffectStyle.value = normalizedEffectStyle;
  material.uniforms.iColorIntensity.value = normalizedColorIntensity;
  material.uniforms.iColorPulse.value = normalizedColorPulse;
  material.uniforms.iMotionWave.value = normalizedMotionWave;
  material.uniforms.iMotionReverse.value = globalMotionReverse === 1;
  material.uniforms.iColorSaturation.value = normalizedColorSaturation;
};

// Initialize everything
function initWebGLEffect() {
  debug('Initializing WebGL tunnel effect');
  
  try {
    // Use our common WebGL initialization function
    webGLContext = initializeWebGL({
      canvasId: 'exCanvas',
      canvasWidth: 320,
      canvasHeight: 200,
      antialias: false
    });
    
    const { canvas, scene } = webGLContext;
    
    debug(`Renderer initialized with canvas size: ${canvas.width}x${canvas.height}`);
    
    // Create standard uniforms
    const uniforms = {
      ...createStandardUniforms(canvas),
      // Additional uniforms specific to this effect
      iSpeed: { value: 1.0 },
      iColorShift: { value: true },
      iColorScheme: { value: 0 },
      iEffectStyle: { value: 0 },
      iColorIntensity: { value: 1.0 },
      iColorPulse: { value: 0.0 },
      iMotionWave: { value: 0.0 },
      iMotionReverse: { value: false },
      iColorSaturation: { value: 1.0 }
    };
    
    // Shadertoy-compatible shader
    const fragmentShader = `
      uniform float iTime;
      uniform vec2 iResolution;
      uniform vec2 iMouse;
      uniform float iSpeed;
      uniform bool iColorShift;
      uniform int iColorScheme;
      uniform int iEffectStyle;
      uniform float iColorIntensity;
      uniform float iColorPulse;
      uniform float iMotionWave;
      uniform bool iMotionReverse;
      uniform float iColorSaturation;
      
      #define T (iTime*3.5*iSpeed*(iMotionReverse ? -1.0 : 1.0))
      #define P(z) (vec3(tanh(cos((z) * .2 + sin(iTime * iMotionWave) * 2.0 * iMotionWave) * .4) * 12., \
                      5.+tanh(cos((z) * .14 + cos(iTime * iMotionWave * 0.5) * 3.0 * iMotionWave) * .5) * 24., (z)))
      #define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))
      #define N normalize
      
      // See "Xyptonjtroz" by nimitz
      // https://www.shadertoy.com/view/4ts3z2
      vec3 tri(in vec3 x){return abs(x-floor(x)-.5);}
      
      vec3 rgb = vec3(0);
      
      // Improved color mixing function with more dynamic variation
      vec3 colorMix(vec3 a, vec3 b, float t) {
          // Non-linear mixing for more interesting transitions
          float curve = smoothstep(0.0, 1.0, t);
          vec3 mixed = mix(a, b, curve);
          
          // Add subtle hue variation
          float hueShift = sin(iTime * 0.5) * 0.1;
          mixed.r = mix(mixed.r, mixed.g, hueShift);
          mixed.b = mix(mixed.b, mixed.r, hueShift * 0.5);
          
          return mixed;
      }
      
      // Enhanced hsv<->rgb conversion
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      
      // Blend modes for richer colors
      vec3 blendOverlay(vec3 base, vec3 blend) {
        return mix(
          2.0 * base * blend,
          1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
          step(0.5, base)
        );
      }
      
      vec3 blendSoftLight(vec3 base, vec3 blend) {
        return mix(
          2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
          sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
          step(0.5, blend)
        );
      }
      
      // Limit whiteness to preserve color richness
      vec3 limitWhiteness(vec3 color, float threshold) {
        float brightness = max(max(color.r, color.g), color.b);
        
        if (brightness > threshold) {
          // If too bright, preserve the hue but reduce value
          vec3 hsv = rgb2hsv(color);
          hsv.z = mix(hsv.z, threshold, smoothstep(threshold, threshold + 0.2, hsv.z));
          
          // Boost saturation as we reduce brightness to keep colors rich
          hsv.y = min(1.0, hsv.y * 1.2);
          
          return hsv2rgb(hsv);
        }
        
        return color;
      }
      
      // Boost saturation without increasing brightness too much
      vec3 saturateColor(vec3 color, float factor) {
        vec3 hsv = rgb2hsv(color);
        hsv.y = clamp(hsv.y * factor, 0.0, 1.0);
        
        // Reduce value slightly to avoid washing out with high saturation
        // Use a gentler curve for brightness reduction at high saturation
        if (factor > 1.0) {
          hsv.z = hsv.z / (1.0 + (factor - 1.0) * 0.15);  // Reduced from 0.3 to 0.15
        }
        
        // Ensure we never go completely dark
        hsv.z = max(hsv.z, 0.05); 
        
        return hsv2rgb(hsv);
      }
      
      // Color scheme palettes with enhanced dynamism
      vec3 getColorPalette(int scheme, vec3 baseColor) {
          // Calculate more dramatic color pulse with multiple frequencies
          float pulseFactor = 1.0;
          if (iColorPulse > 0.0) {
              // Multi-frequency pulsing for more complex effect
              float fastPulse = sin(iTime * 5.0) * 0.5 + 0.5;
              float slowPulse = sin(iTime * 2.0) * 0.5 + 0.5;
              float weirdPulse = sin(iTime * 0.7) * sin(iTime * 1.3) * 0.5 + 0.5;
              
              // Mix between different pulse frequencies
              float mixedPulse = mix(
                  mix(fastPulse, slowPulse, 0.5),
                  weirdPulse,
                  sin(iTime * 0.3) * 0.5 + 0.5
              );
              
              // Apply a more dramatic effect (up to 50% variation at max pulse)
              pulseFactor = 1.0 + (mixedPulse - 0.5) * iColorPulse * 0.8;
          }
          
          // Convert baseColor to HSV for more flexible manipulation
          vec3 baseHSV = rgb2hsv(baseColor);
          
          // Apply non-linear intensity adjustment (preserves some color at 0 intensity)
          float intensityFactor = max(0.01, iColorIntensity) * pulseFactor;
          
          // Dynamic positions on the tunnel affect color
          float depthEffect = sin(baseHSV.x * 10.0 + iTime) * 0.1;
          float spatialEffect = sin(baseHSV.z * 8.0 + iTime * 0.5) * 0.15;
          
          // Apply these effects to the base HSV
          baseHSV.x += depthEffect;  // Hue shift
          
          // Enhance hue variations with color shift
          if (iColorShift) {
              // More gradual hue rotation when color shift is enabled
              // Use depth-based variation that changes smoothly
              float depthCoord = baseHSV.z * 3.0 + iTime * 0.1;
              float hueShift = sin(depthCoord) * sin(depthCoord * 0.7) * 0.07; // Gentler shift with multiple frequencies
              
              // Apply smoothstep to create more continuous transitions
              float smoothFactor = smoothstep(0.0, 1.0, sin(iTime * 0.15) * 0.5 + 0.5);
              hueShift *= smoothFactor;
              
              baseHSV.x = fract(baseHSV.x + hueShift); // Wrap around the hue circle
          }
          
          baseHSV.y = min(1.0, baseHSV.y * (1.0 + spatialEffect));  // Saturation - removed iColorSaturation here
          
          // Base intensity with non-linear curve for better low-intensity look
          baseHSV.z = pow(baseHSV.z, 0.5) * intensityFactor;
          
          // Convert enhanced HSV back to RGB
          vec3 enhancedBase = hsv2rgb(baseHSV);
          
          // Default blue palette with enhanced dynamism
          vec3 color = enhancedBase * vec3(.5, .8, 1.3);
          
          if (scheme == 1) {
              // Cyberpunk - Purple and teal with dynamic shifting
              float cybShift = sin(iTime * 0.2) * 0.2;
              color = enhancedBase * vec3(1.0 + cybShift, 0.25, 1.4 - cybShift) + 
                     vec3(0.03, 0.05 + sin(iTime * 0.7) * 0.03, 0.25);
          }
          else if (scheme == 2) {
              // Fire - Dynamic reds, oranges and yellow tones
              float flicker = sin(iTime * 8.0) * sin(iTime * 5.7) * 0.1;
              float glow = sin(iTime * 0.4) * 0.2 + 0.8;
              // Reduce green component and increase red for a more intense fire look
              color = enhancedBase * vec3(1.9 * glow, (0.4 + flicker), 0.05) + 
                     vec3(flicker * 0.2, 0.0, 0.0);
          }
          else if (scheme == 3) {
              // Toxic - Pulsing greens and yellows
              float toxicPulse = sin(iTime * 1.2) * 0.15 + 0.85;
              float yellowShift = cos(iTime * 0.7) * 0.3;
              color = enhancedBase * vec3(0.25 + yellowShift, 1.6 * toxicPulse, 0.35) +
                     vec3(sin(iTime * 3.1) * 0.05, 0.0, 0.0);
          }
          else if (scheme == 4) {
              // Ethereal - Color cycling pastels
              float etherealShift = sin(iTime * 0.3);
              float blueShift = cos(iTime * 0.5) * 0.2;
              color = enhancedBase * vec3(0.7 + etherealShift * 0.1, 0.9, 1.3 - blueShift) + 
                     vec3(0.25 + sin(iTime * 1.1) * 0.1, etherealShift * 0.1, 0.4 + blueShift * 0.2);
          }
          else if (scheme == 5) {
              // Monochrome - With subtle, shifting tint
              float tint = sin(iTime * 0.2) * 0.05;
              float luminance = dot(enhancedBase, vec3(0.299, 0.587, 0.114));
              color = vec3(luminance * 1.6) + vec3(tint, tint, tint * 1.5);
          }
          else if (scheme == 6) {
              // Rainbow - Spectrum cycling with spatial variation
              float hueBase = iTime * 0.1;
              float hueSpatial = sin(enhancedBase.x * 5.0 + enhancedBase.y * 3.0) * 0.2;
              vec3 rainbow;
              
              // Enhanced RGB rainbow with spatial variation
              rainbow.r = sin(hueBase + hueSpatial) * 0.5 + 0.7;
              rainbow.g = sin(hueBase + 2.0 + hueSpatial) * 0.5 + 0.7;
              rainbow.b = sin(hueBase + 4.0 + hueSpatial) * 0.5 + 0.7;
              
              // Add some saturation pulsing
              float rainbowPulse = sin(iTime * 2.0) * 0.1 + 0.9;
              color = enhancedBase * (rainbow * rainbowPulse) + vec3(0.15);
          }
          else if (scheme == 7) {
              // Electric - Dynamic blues and whites with lightning flashes
              // Make flash less frequent (reduced threshold from 0.95 to 0.98)
              float flash = pow(sin(iTime * 10.0) * 0.5 + 0.5, 4.0) * sin(iTime * 5.0);
              float glow = sin(iTime * 0.5) * 0.2 + 0.8;
              color = enhancedBase * vec3(0.2, 0.7, 1.8 * glow) + 
                    vec3(0.3 * sin(T * 0.3)) + vec3(flash);
              
              // Occasional lightning strike (reduced frequency by changing threshold)
              if (sin(iTime * 0.73) > 0.98 || flash > 0.85) { // Changed from 0.95 to 0.98 and 0.7 to 0.85
                  color += vec3(0.2, 0.3, 0.6) * flash * (1.0 + iColorPulse);
              }
          }
          else if (scheme == 8) {
              // Amethyst - Rich purples with subtle sparkle
              float shimmer = pow(sin(iTime * 7.0 + enhancedBase.x * 20.0) * 0.5 + 0.5, 8.0) * 0.2;
              float purpleShift = sin(iTime * 0.3) * 0.1;
              color = enhancedBase * vec3(0.8 + purpleShift, 0.3, 1.2 - purpleShift) + 
                     vec3(shimmer) + vec3(0.05, 0.0, 0.1);
          }
          else if (scheme == 9) {
              // Coral Reef - Vibrant underwater colors
              float waveMotion = sin(iTime * 0.5 + enhancedBase.y * 3.0) * 0.1;
              float blueOverlay = sin(iTime * 0.2) * 0.1 + 0.2;
              color = enhancedBase * vec3(1.3 + waveMotion, 0.8 - waveMotion, 0.4) + 
                     vec3(0.0, 0.1, blueOverlay);
              
              // Occasional bright coral highlights
              if (sin(enhancedBase.x * 10.0 + iTime) > 0.8) {
                  color += vec3(0.15, 0.05, 0.0);
              }
          }
          else if (scheme == 10) {
              // Deep Sea - Dark blues with bioluminescent accents
              float luminescence = pow(sin(enhancedBase.z * 8.0 + iTime) * 0.5 + 0.5, 4.0) * 0.4;
              float depth = sin(iTime * 0.1) * 0.1 + 0.8;
              color = enhancedBase * vec3(0.1, 0.3, depth) + 
                     vec3(0.0, luminescence * 0.6, luminescence);
              
              // Add occasional glowing particles
              if (fract(sin(dot(vec2(enhancedBase.x, enhancedBase.y * iTime * 0.1), vec2(12.9898, 78.233))) * 43758.5453) > 0.99) {
                  color += vec3(0.0, 0.2, 0.3) * (sin(iTime * 2.0) * 0.5 + 0.5);
              }
          }
          else if (scheme == 11) {
              // Emerald - Deep greens with crystal-like reflections
              float crystalFlash = pow(sin(enhancedBase.y * 10.0 + iTime * 2.0) * 0.5 + 0.5, 6.0) * 0.3;
              float greenShift = sin(iTime * 0.4) * 0.1;
              color = enhancedBase * vec3(0.2, 1.1 + greenShift, 0.5) + 
                     vec3(crystalFlash * 0.7, crystalFlash, crystalFlash * 0.6);
          }
          else if (scheme == 12) {
              // Neon - Vibrant glowing colors with dark backdrop
              float neonPulse = sin(iTime * 1.5) * 0.15 + 0.85;
              vec3 neonColor;
              
              // Shifting neon hue based on position and time
              float hueShift = fract(enhancedBase.z * 0.2 + iTime * 0.05);
              float hueSector = floor(hueShift * 3.0);
              
              if (hueSector < 1.0) {
                  neonColor = vec3(1.0, 0.1, 0.8); // Pink
              } else if (hueSector < 2.0) {
                  neonColor = vec3(0.1, 1.0, 0.8); // Cyan
              } else {
                  neonColor = vec3(0.9, 0.8, 0.1); // Yellow
              }
              
              // Apply the neon color with glow effect
              color = enhancedBase * neonColor * neonPulse + vec3(0.05);
              
              // Add dark backdrop for contrast
              color = mix(vec3(0.02, 0.02, 0.05), color, min(1.0, color.r + color.g + color.b));
          }
          else if (scheme == 13) {
              // Rose Gold - Warm metallic pinks and golds
              float metallic = pow(sin(enhancedBase.x * 5.0 + enhancedBase.y * 3.0 + iTime) * 0.5 + 0.5, 2.0);
              float warmth = sin(iTime * 0.3) * 0.1 + 0.9;
              color = enhancedBase * vec3(1.1 * warmth, 0.7, 0.6) + 
                     vec3(metallic * 0.3, metallic * 0.2, metallic * 0.1);
          }
          else if (scheme == 14) {
              // Sunset - Warm oranges, reds and purples
              float skyGradient = enhancedBase.y * 2.0;
              float sunsetPhase = sin(iTime * 0.2) * 0.5 + 0.5; // Time of sunset
              
              // Sky colors transition from orange/red to purple/blue
              vec3 horizon = mix(
                  vec3(1.5, 0.6, 0.2), // Orange-red
                  vec3(0.9, 0.2, 0.5), // Pink-red
                  sunsetPhase
              );
              
              vec3 zenith = mix(
                  vec3(0.7, 0.3, 0.9), // Purple
                  vec3(0.2, 0.2, 0.8), // Deep blue
                  sunsetPhase
              );
              
              // Blend based on position
              color = enhancedBase * mix(horizon, zenith, skyGradient);
              
              // Add sun glow
              float sun = pow(max(0.0, 1.0 - length(enhancedBase.xy * 2.0)), 5.0);
              color += vec3(1.0, 0.6, 0.2) * sun * 0.5;
          }
          else if (scheme == 15) {
              // Vapor Wave - Retro 80s aesthetic
              float gridEffect = max(0.0, 
                  sin(enhancedBase.x * 10.0 + iTime) * sin(enhancedBase.y * 10.0 + iTime) - 0.8) * 0.5;
              
              // Pink and cyan palette with subtle movement
              float vaporShift = sin(iTime * 0.2) * 0.1;
              color = enhancedBase * vec3(0.9 + vaporShift, 0.4, 0.9 - vaporShift) + 
                     vec3(0.1, 0.1 + gridEffect, 0.3);
              
              // Add occasional glitch lines
              if (fract(iTime * 2.0) < 0.03) {
                  float glitchPos = floor(sin(iTime * 10.0) * 10.0) / 10.0;
                  if (abs(enhancedBase.y - glitchPos) < 0.02) {
                      color *= vec3(0.8, 1.2, 1.5);
                  }
              }
          }
          
          // Dynamic color adjustments - apply different effects based on depth and position
          // Convert to HSV for easier manipulation
          vec3 resultHSV = rgb2hsv(color);
          
          // Dynamic saturation based on position and time
          float saturationMod = sin(iTime * 0.4 + resultHSV.x * 10.0) * 0.15;
          resultHSV.y = clamp(resultHSV.y + saturationMod, 0.0, 1.0);  // Removed iColorSaturation here
          
          // Subtle hue rotation over time, different for each position
          resultHSV.x += sin(iTime * 0.1 + resultHSV.z * 3.0) * 0.02;
          
          // Convert back to RGB
          color = hsv2rgb(resultHSV);
          
          // Final contrast enhancement with reduced brightness
          color = pow(color, vec3(0.95));
          
          // Apply soft light blend for richer colors
          color = blendSoftLight(color, vec3(0.7, 0.8, 0.9));
          
          // Limit whiteness for punchier color
          color = limitWhiteness(color, 0.85);
          
          return color;
      }
      
      // Apply visual effects based on style
      vec4 applyEffectStyle(vec4 color, float depth, int style) {
          // Add color shift specific anti-banding in all modes
          if (iColorShift) {
              // Very subtle dithering to break up color bands
              vec2 uv = gl_FragCoord.xy / iResolution.xy;
              float dither = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 0.01 - 0.005;
              color.rgb += vec3(dither);
          }
          
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
          // Add motion wave effect to the surface
          // Only calculate wave effect if actually used
          float waveEffect = 0.0;
          if (iMotionWave > 0.0) {
              waveEffect = sin(p.z * 0.2 + iTime * 2.0) * iMotionWave * 0.5;
          }
              
          // Optimize with fewer calculations
          vec3 p1 = p + waveEffect;
          vec3 p2 = p*.2 + waveEffect + tri(.05*T+p1);
          
          return (1.0 - dot(tri(.15*T+p*.25+tri(p2)) + tri(p1)*.2, vec3(2.5)));
      }
      
      float map(vec3 p) {
          float ps,a;
          float s =  1.5 - min(length(p.xy - P(p.z).xy),
                                     (p.y - P(p.z).x));
          s = min(6.5 + p.y, s);
          s -= triSurface(p);
          
          // Reduce iterations in surface detail loop and use larger steps
          for (a = .1; a < 1.;
              s -= abs(dot(sin(T+p * a * 40.), vec3(.01))) / a,
              a += a * 1.5); // Increased step size from a+=a to a+=a*1.5
              
          // Add base color
          rgb += sin(p)*.15+.175;
          
          // When color shift is enabled, add extra color variation
          if (iColorShift) {
              // Use smoother functions with smaller multipliers for gentler variation
              vec3 colorVar = vec3(
                  sin(p.x * 0.2 + p.z * 0.1 + iTime * 0.23),
                  sin(p.y * 0.2 + p.z * 0.12 + iTime * 0.19),
                  sin(p.z * 0.2 + p.x * 0.11 + iTime * 0.17)
              ) * 0.02; // Much smaller magnitude for subtlety
              
              // Apply smoothstep to soften the transition
              colorVar = smoothstep(-0.02, 0.02, colorVar) * 0.03;
              
              // Add the smoothed color variation
              rgb += colorVar;
          }
          
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
          
          #define MAX_DISTANCE 100.0
          #define MAX_ITER 60.0
          
          // More aggressive step size for faster convergence
          while(i++ < MAX_ITER && s > .001 && d < MAX_DISTANCE)
              p = ro + D * d,
              d += s = map(p)*.4; // Increased step multiplier from 0.3 to 0.4
          
          // Reduce iterations in color detail loop
          for (a = .5; a < 4.; // Start from 0.5 instead of 0.4
              rgb +=  abs(dot(sin(p* a * 8.),
              vec3(.07))) / a, a *= 1.6); // Increased step multiplier from 1.4142 to 1.6
          
          // Apply color scheme
          rgb = getColorPalette(iColorScheme, rgb);
          
          // Use a custom power curve to preserve more saturation
          // Apply a less aggressive distance attenuation with a minimum brightness floor
          float distanceAttenuation = mix(1.0, exp(-d/3.5), 0.85); // Less aggressive falloff (was -d/2.5)
          vec3 baseColor = pow(rgb * distanceAttenuation + 0.03, vec3(0.43)); // Added brightness floor and slightly adjusted power
          
          // Apply extra saturation to the final color before intensity adjustment
          // Only apply saturation here, not in getColorPalette
          baseColor = saturateColor(baseColor, iColorSaturation);
          
          // Limit white areas
          baseColor = limitWhiteness(baseColor, 0.9);
          
          // Add final color richness through overlay blend
          baseColor = blendOverlay(baseColor, baseColor * vec3(0.95, 1.0, 1.05));
          
          vec4 finalColor = vec4(baseColor, 1.0);
          
          // Apply effect style
          fragColor = applyEffectStyle(finalColor, d, iEffectStyle);
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

    // Make initial update call
    (window as any).update(true);

    // Start animation loop using our common utility
    debug('Starting animation loop');
    
    startAnimationLoop(webGLContext, material, (time) => {
      // Force update every frame to catch any control changes from SignalRGB
      // This ensures the controls work even if SignalRGB doesn't trigger events
      (window as any).update();
      
      // Log occasionally to avoid flooding the console
      if (time % 5 < 0.1) {
        debug('Animation frame', { time: time.toFixed(2) });
      }
    });
    
  } catch (error) {
    debug('ERROR during initialization:', error);
    console.error('Failed to initialize WebGL effect:', error);
  }
}

// Use our common effect initialization utility
initializeEffect(initWebGLEffect); 