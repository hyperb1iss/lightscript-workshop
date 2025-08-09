// Kaleido Tunnel - Fragment Shader
// Lightweight kaleidoscopic tunnel with configurable symmetry and twist

precision highp float;

uniform vec2 iResolution;
uniform float iTime;

// Controls
uniform float iSpeed;             // 0.2 - ~3.0 (normalized)
uniform float iColorIntensity;    // 0.0 - 2.0
uniform float iColorSaturation;   // 0.0 - 2.0
uniform int   iSegments;          // 3 - 12
uniform float iTwist;             // 0.0 - 1.0
// Removed depth falloff – always render full pattern
uniform int   iColorMode;         // 0: Rainbow, 1: Neon, 2: Mono
uniform float iColorShift;        // 0.0 - 2.0
uniform float iAberration;        // 0.0 - 1.0
uniform float iWarp;              // 0.0 - 1.0
uniform float iPulse;             // 0.0 - 1.0
uniform int   iStyle;             // 0: Standard, 1: Glitch, 2: Holo, 3: Grain
uniform float iMultiHue;          // 0.0 - 1.0
uniform float iPaletteDrift;      // 0.0 - 1.0
uniform float iSpectrumSpread;    // 0.0 - 2.0

const float TAU = 6.28318530718;

// HSV to RGB
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Multi-hue palette mixing
vec3 palette(float t, int mode, float sat){
  t = fract(t);
  float s = clamp(sat, 0.0, 1.0);
  // Secondary hue sources for richer color
  float drift = iPaletteDrift * 0.25;
  float spread = iSpectrumSpread * 0.15;
  float t2 = fract(t + spread + sin(iTime * 0.17) * drift);
  float t3 = fract(t - spread + cos(iTime * 0.11) * drift);
  vec3 base;
  if (mode == 1) {
    // Neon – punchy triad
    float sector = floor(t * 3.0);
    vec3 c = sector < 1.0 ? vec3(1.0, 0.1, 0.8)
             : (sector < 2.0 ? vec3(0.1, 1.0, 0.9)
                              : vec3(1.0, 1.0, 0.1));
    // Add slight shift over time for living color
    float shift = sin(t * TAU * 3.0 + iTime * 0.6) * 0.08;
    vec3 hsv = vec3(fract(t + shift), s, 1.0);
    return mix(c, hsv2rgb(hsv), 0.5);
  }
  if (mode == 2) {
    // Monochrome
    return vec3(t * 0.8 + 0.2);
  }
  if (mode == 3) { // Electric
    float flash = pow(sin(iTime * 10.0) * 0.5 + 0.5, 4.0);
    base = vec3(0.2, 0.7, 1.6) + flash * 0.2;
  }
  if (mode == 4) { // Amethyst
    base = vec3(0.9, 0.3 + 0.1*sin(iTime*0.5), 1.2);
  }
  if (mode == 5) { // Sunset
    base = mix(vec3(1.4, 0.6, 0.2), vec3(0.2, 0.2, 0.8), t);
  }
  if (mode == 6) { // Toxic
    base = vec3(0.3, 1.6, 0.4);
  }
  if (mode == 7) { // Vaporwave
    base = vec3(0.95, 0.4, 0.9);
  }
  if (mode == 8) { // Deep Sea
    base = vec3(0.05, 0.3, 0.6);
  }
  if (mode == 1 || mode == 3 || mode == 4 || mode == 5 || mode == 6 || mode == 7 || mode == 8) {
    // Multi-hue blend
    vec3 c2 = hsv2rgb(vec3(t2, s, 1.0));
    vec3 c3 = hsv2rgb(vec3(t3, s, 1.0));
    float mh = clamp(iMultiHue, 0.0, 1.0);
    vec3 mix12 = mix(base, c2, mh * 0.6);
    return mix(mix12, c3, mh * 0.4);
  }
  // Rainbow default with multi-hue enrichment
  vec3 r1 = hsv2rgb(vec3(t, s, 1.0));
  vec3 r2 = hsv2rgb(vec3(t2, s, 1.0));
  vec3 r3 = hsv2rgb(vec3(t3, s, 1.0));
  float mh = clamp(iMultiHue, 0.0, 1.0);
  vec3 rr = mix(mix(r1, r2, mh * 0.5), r3, mh * 0.35);
  return rr;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  // Normalized, centered coordinates with aspect correction
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  float time = iTime * iSpeed;

  // Pre-warp UV for psychedelic distortion
  float w = iWarp * 0.6;
  uv += vec2(
    sin((uv.y + time*0.5) * 6.0) * w * 0.08,
    cos((uv.x - time*0.4) * 6.0) * w * 0.08
  );
  // Polar coordinates
  float r = length(uv) + 1e-6;
  float a = atan(uv.y, uv.x);

  // Kaleidoscope segmentation with mirror symmetry
  float seg = max(3.0, float(iSegments));
  float sector = TAU / seg;
  a = mod(a + sector * 0.5, sector) - sector * 0.5; // wrap to [-sector/2, sector/2]
  a = abs(a); // mirror

  // Twist increases with radius and time; iTwist in 0..1
  float twist = iTwist * (0.6 + 0.4 * sin(time * 0.5));
  float aTwisted = a + r * twist * 2.0 + time * twist * 0.4;

  // Tunnel pattern: combine angular and radial waves
  float waveA = sin(aTwisted * (6.0 + seg * 0.5) - time * 1.6);
  float waveR = sin(r * (18.0 + seg * 0.8) - time * 1.2);
  float patt = 0.5 + 0.5 * (0.6 * waveA + 0.4 * waveR);

  // No radial falloff – full-frame color
  float fall = 1.0;

  // Color selection
  float hue = fract(aTwisted / sector + r * 0.25 + time * 0.06);
  // Psychedelic color shift & pulsing (includes spatial variation)
  hue += iColorShift * 0.1 * sin(time * (0.6 + 0.4 * iPulse) + r * 4.0);
  float pulse = 1.0 + 0.5 * iPulse * sin(time * 2.5 + r * 6.0);
  float sat01 = clamp(iColorSaturation, 0.0, 2.0) * 0.75; // bring to 0..1.5 range
  vec3 col = palette(hue, iColorMode, clamp(sat01, 0.0, 1.0));

  // Apply pattern brightness and depth
  float inten = clamp(iColorIntensity, 0.0, 2.0);
  vec3 color = col * patt * fall * inten * pulse;

  // Gentle vignette to focus center
  float vign = smoothstep(1.3, 0.2, r);
  color *= vign;

  // Post styles
  if (iStyle == 1) { // Glitch
    float line = step(0.98, fract(gl_FragCoord.y * 0.03 + sin(time) * 0.1));
    color.rb += line * 0.2;
  } else if (iStyle == 2) { // Holo
    float scan = 0.7 + 0.3 * sin(gl_FragCoord.y * 0.6 + time * 10.0);
    color *= vec3(0.8, 1.0, 1.1) * scan;
  } else if (iStyle == 3) { // Grain
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.06;
  }

  // Chromatic aberration
  float ab = iAberration * 0.003;
  vec2 dir = normalize(uv) * ab;
  vec3 cR = color;
  vec3 cG = color;
  vec3 cB = color;
  // Cheap per-channel offset approximation without re-sampling scene
  cR.r = clamp(color.r + ab * 0.8, 0.0, 1.0);
  cB.b = clamp(color.b + ab * 0.8, 0.0, 1.0);
  color = vec3(cR.r, cG.g, cB.b);

  fragColor = vec4(color, 1.0);
}

void main(){
  mainImage(gl_FragColor, gl_FragCoord.xy);
}


