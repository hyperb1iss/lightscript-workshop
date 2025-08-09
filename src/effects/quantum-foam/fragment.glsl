// Quantum Foam — volumetric foam + particle pairs + collapse flashes
// Lightweight, vivid, and parameterized for SignalRGB

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

// prettier-ignore
// Controls
uniform float iDensity;          // 0.0 - 2.0
uniform float iFluctuationSpeed; // 0.0 - 1.0
uniform float iEnergy;           // 0.0 - 2.0 (brightness)
uniform float iSaturation;       // 0.0 - 2.0
uniform float iFoamScale;        // 0.5 - 4.0
uniform float iTurbulence;       // 0.0 - 2.0
uniform float iCollapseRate;     // 0.0 - 1.0
uniform float iObserver;         // 0.0 or 1.0
uniform float iVirtualParticles; // 0.0 or 1.0

// Hash & noise helpers
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Gradient noise (value noise with smooth interpolation)
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash21(i.xy + i.z);
  float n100 = hash21(i.xy + vec2(1.0, 0.0) + i.z);
  float n010 = hash21(i.xy + vec2(0.0, 1.0) + i.z);
  float n110 = hash21(i.xy + vec2(1.0, 1.0) + i.z);

  float n001 = hash21(i.xy + (i.z + 1.0));
  float n101 = hash21(i.xy + vec2(1.0, 0.0) + (i.z + 1.0));
  float n011 = hash21(i.xy + vec2(0.0, 1.0) + (i.z + 1.0));
  float n111 = hash21(i.xy + vec2(1.0, 1.0) + (i.z + 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);

  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

// Fractional Brownian Motion
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return s;
}

// Ridged FBM for foam-like structure
float ridged(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(2.0 * vnoise(p) - 1.0);
    s += a * n;
    p *= 2.03;
    a *= 0.55;
  }
  return s;
}

// HSV -> RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Virtual particle pairs — pop in/out quickly near random cell centers
float particlePairs(vec2 uv, float t) {
  if (iVirtualParticles < 0.5) return 0.0;
  vec2 gid = floor(uv * 12.0);
  float h = hash21(gid);
  float phase = fract(t * 2.0 + h * 10.0);
  float live = step(phase, 0.18); // very short lifetime
  vec2 center = (gid + 0.5 + vec2(hash11(h), hash11(h + 1.23))) / 12.0;
  float d = length(uv - center);
  float glow = exp(-d * 120.0);
  return glow * live;
}

// Collapse flashes — sporadic grid-based bright events
float collapseFlash(vec2 uv, float t) {
  float rate = clamp(iCollapseRate, 0.0, 1.0);
  vec2 gid = floor(uv * mix(8.0, 18.0, rate));
  float h = hash21(gid + floor(t * (2.0 + 6.0 * rate)));
  float trigger = step(0.985 - rate * 0.03, h);
  float pulse = exp(-fract(t * 6.0) * 10.0);
  float d = length(fract(uv * mix(8.0, 18.0, rate)) - 0.5);
  float mask = smoothstep(0.45, 0.0, d);
  return trigger * pulse * mask;
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  float speed = mix(0.1, 2.5, iFluctuationSpeed);
  float time = iTime * speed;

  // Observer effect — slightly stabilize and sharpen when "observed"
  float observer = iObserver;
  p *= mix(1.0, 0.96, observer);

  // Flow field warping
  float warp = iTurbulence * 0.6;
  vec2 flow = vec2(
    fbm(vec3(p * 1.2, time * 0.4)),
    fbm(vec3(p.yx * 1.2, -time * 0.3))
  );
  p += (flow - 0.5) * warp;

  // Volumetric sampling through z to build foam depth
  float density = clamp(iDensity, 0.0, 2.0);
  float scale = mix(0.5, 4.0, clamp(iFoamScale, 0.0, 4.0) * 0.25);
  vec3 q = vec3(p * scale * (1.0 + density), time * 0.25);

  float foam = 0.0;
  float slices = mix(6.0, 16.0, clamp(density, 0.0, 1.0));
  float dz = 0.25 + density * 0.35;
  for (int i = 0; i < 20; i++) {
    if (float(i) >= slices) break;
    float z = float(i) * dz;
    foam += ridged(q + vec3(0.0, 0.0, z));
  }
  foam /= slices;

  // Additional micro detail
  float micro = fbm(q * 2.5 + vec3(0.0, 0.0, time));
  foam = mix(
    foam,
    foam * (0.7 + 0.6 * micro),
    clamp(iTurbulence, 0.0, 2.0) * 0.5
  );

  // Events
  float pairs = particlePairs(uv, time);
  float flash = collapseFlash(uv, time);

  // Color — map foam to vivid palette controlled by saturation and energy
  float hue = 0.6 + 0.25 * sin(time * 0.7 + foam * 6.283);
  float sat = clamp(iSaturation, 0.0, 2.0);
  float val = clamp(iEnergy, 0.0, 2.0) * (0.45 + 0.55 * foam);
  vec3 base = hsv2rgb(vec3(hue, clamp(0.7 * sat, 0.0, 1.5), val));

  // Add events — additive glow
  vec3 color = base;
  color += vec3(1.0, 0.6, 0.2) * flash * (0.7 + 0.6 * sat);
  color += vec3(0.6, 0.9, 1.5) * pairs * (0.6 + 0.8 * sat);

  // Observer sharpness: reduce fuzz and increase contrast
  if (observer > 0.5) {
    float l = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(l), 0.18);
    color = pow(color, vec3(0.9));
  }

  fragColor = vec4(color, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}

