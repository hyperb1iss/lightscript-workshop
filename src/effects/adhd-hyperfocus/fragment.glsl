// ADHD Hyperfocus — tunnel vision, dopamine sparks, peripheral fade
precision highp float;

uniform float iTime;
uniform vec2 iResolution;

// Controls (normalized to sensible ranges in TS)
uniform float iFocusRadius;      // 0.0 - 1.0 (radius of sharp center)
uniform float iFocusStrength;    // 0.0 - 2.0 (center boost)
uniform float iPeripheralBlur;   // 0.0 - 2.0 (blur intensity grows with radius)
uniform float iSaturation;       // 0.0 - 2.0
uniform float iEnergy;           // 0.0 - 2.0 (brightness)
uniform float iSparkDensity;     // 0.0 - 2.0
uniform float iTunnelSpeed;      // 0.0 - 2.0
uniform float iParalysis;        // 0.0 - 1.0 (reduces motion)
uniform float iNoise;            // 0.0 - 2.0
uniform int   iColorMode;        // 0=Dopamine,1=Neon,2=Mono

// Helpers
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

// Basic value noise (trilinear interp)
float vnoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 palette(float t, int mode) {
  if (mode == 1) { // Neon
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.00, 0.33, 0.67)));
  } else if (mode == 2) { // Mono
    return vec3(t);
  } else { // Dopamine (hot/cool cycling)
    float h = fract(t);
    vec3 c = hsv2rgb(vec3(h, 0.9, 1.0));
    return c;
  }
}

// Dopamine sparks travelling inward
float sparks(vec2 uv, vec2 center, float time, float density, float paralysis) {
  // Fewer cells when low density; 10..28
  float grid = mix(10.0, 28.0, clamp(density * 0.5, 0.0, 1.0));
  vec2 gid = floor(uv * grid);
  float h = hash21(gid);
  vec2 cellCenter = (gid + 0.5 + 0.25 * vec2(hash11(h), hash11(h + 1.7))) / grid;

  // Direction toward focus
  vec2 dir = normalize(center - cellCenter + 1e-4);
  float spd = mix(1.6, 0.35, paralysis); // paralysis slows down

  // Each cell has a spark life
  float life = fract(time * spd + h * 7.3);
  vec2 pos = mix(cellCenter, center, life);

  // Only spawn if outside focus radius
  float r = distance(cellCenter, center);
  float activeMask = step(0.22 + 0.08 * density, r);

  float d = length(uv - pos);
  float glow = exp(-d * mix(150.0, 60.0, density));
  glow *= smoothstep(0.0, 0.2, life) * smoothstep(1.0, 0.6, life);
  return glow * activeMask;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 center = vec2(0.5);
  vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  float t = iTime * (0.2 + 0.8 * iTunnelSpeed) * (1.0 - 0.6 * iParalysis);
  float r = length(p);
  // Avoid GLSL ES 1.0 two-argument atan; angle not required for current visuals

  // Tunnel rings animate to enhance hyperfocus pull
  float rings = sin(12.0 * r - 3.5 * t);

  // Base color via palette
  float hueT = fract(0.62 + 0.12 * t + 0.25 * rings);
  vec3 base = palette(hueT, iColorMode);
  base *= iEnergy;

  // Focus factor — strong in center, falling off with radius
  float focus = smoothstep(iFocusRadius, 0.0, r);
  float centerBoost = mix(1.0, 1.0 + iFocusStrength, 1.0 - focus);
  base *= centerBoost;

  // Peripheral desaturation and blur proxy
  float periph = smoothstep(iFocusRadius * 0.8, 0.75, r);
  // Use iPeripheralBlur as a strength multiplier for the periphery falloff
  float periphStrength = clamp(iPeripheralBlur, 0.0, 2.0);
  float periphFactor = clamp(periph * periphStrength, 0.0, 1.0);
  float sat = mix(iSaturation, iSaturation * 0.4, periphFactor);
  // Convert to HSV-ish by scaling saturation via luma mix
  float l = dot(base, vec3(0.299, 0.587, 0.114));
  base = mix(vec3(l), base, clamp(sat, 0.0, 2.0));

  // Procedural film/noise (more at the edges)
  float n = (vnoise(uv * 800.0 + t * 6.0) - 0.5) * iNoise * (0.4 + 0.6 * periphFactor);
  base += n;

  // Dopamine sparks
  float density = iSparkDensity;
  float sp = sparks(uv, center, t, density, iParalysis);
  vec3 sparkCol = palette(hueT + 0.1, iColorMode);
  base += sparkCol * sp * (0.7 + 0.6 * iSaturation);

  fragColor = vec4(base, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}


