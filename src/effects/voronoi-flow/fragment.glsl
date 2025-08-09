// Voronoi Flow — cellular rivers with domain-warped motion
// High-contrast, reads well on RGB matrices

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

// prettier-ignore
// Controls
uniform float iScale;        // 0.3..4.0  (cell size)
uniform float iSpeed;        // 0..2      (flow speed)
uniform float iRidge;        // 0..2      (ridge sharpness)
uniform float iSwirl;        // 0..2      (domain warp amplitude)
uniform float iShimmer;      // 0..2      (edge sparkle)
uniform int   iPalette;      // palette selector
uniform float iSaturation;   // 0..2
uniform float iBrightness;   // 0..2

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float n = hash21(p);
  return fract(vec2(n, n * 1.2154 + 0.123));
}

// Simple value noise
float vnoise(vec2 x) {
  vec2 i = floor(x),
    f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 palette(float t, int mode) {
  t = fract(t);
  if (mode == 0) {
    // Rainbow
    return hsv2rgb(vec3(t, 0.9, 1.0));
  } else if (mode == 1) {
    // Neon
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  } else if (mode == 2) {
    // Mono
    return vec3(t);
  } else if (mode == 3) {
    // Ocean
    return mix(vec3(0.0, 0.2, 0.5), vec3(0.0, 0.9, 1.0), t);
  } else if (mode == 4) {
    // Fire
    return mix(
      vec3(0.2, 0.0, 0.0),
      vec3(1.0, 0.6, 0.0),
      smoothstep(0.0, 1.0, t)
    );
  } else if (mode == 5) {
    // Aurora
    return mix(
      vec3(0.05, 0.9, 0.2),
      vec3(0.2, 0.2, 1.0),
      0.5 + 0.5 * sin(t * 6.28)
    );
  } else if (mode == 6) {
    // Cyberpunk
    return mix(vec3(1.0, 0.0, 0.8), vec3(0.0, 1.0, 1.0), t);
  } else if (mode == 7) {
    // Sunset
    return mix(vec3(0.9, 0.2, 0.0), vec3(1.0, 0.8, 0.2), t);
  } else if (mode == 8) {
    // Candy
    return mix(vec3(1.0, 0.0, 0.6), vec3(0.2, 1.0, 0.8), t);
  } else if (mode == 9) {
    // Pastel
    return mix(vec3(0.9, 0.8, 1.0), vec3(0.8, 1.0, 0.9), t);
  } else if (mode == 10) {
    // Forest
    return mix(vec3(0.0, 0.2, 0.0), vec3(0.2, 0.9, 0.3), t);
  } else if (mode == 11) {
    // Heatmap
    return hsv2rgb(vec3(0.05 + 0.95 * t, 1.0, 1.0));
  } else if (mode == 12) {
    // Viridis-ish
    return mix(vec3(0.267, 0.004, 0.329), vec3(0.993, 0.906, 0.144), t);
  } else if (mode == 13) {
    // Inferno-ish
    return mix(vec3(0.001, 0.0, 0.014), vec3(0.988, 0.998, 0.644), t);
  } else if (mode == 14) {
    // Plasma-ish
    return mix(vec3(0.05, 0.03, 0.527), vec3(0.94, 0.975, 0.131), t);
  } else if (mode == 15) {
    // Magma-ish
    return mix(vec3(0.001, 0.0, 0.016), vec3(0.987, 0.73, 0.258), t);
  }
  return hsv2rgb(vec3(t, 0.9, 1.0));
}

// Worley noise (F1 and F2)
vec2 worley(vec2 p) {
  vec2 ip = floor(p);
  float f1 = 1e9,
    f2 = 1e9;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(ip + g) - 0.5;
      vec2 d = ip + g + o - p;
      float l = dot(d, d);
      if (l < f1) {
        f2 = f1;
        f1 = l;
      } else if (l < f2) {
        f2 = l;
      }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  float scale = max(0.3, iScale);
  float speed = iSpeed;
  float ridge = iRidge;
  float swirl = iSwirl;
  float shimmer = iShimmer;

  // Domain warp for flow
  vec2 w1 = vec2(
    vnoise(uv * 2.0 + iTime * 0.3 * speed),
    vnoise(uv * 2.0 + 17.3 + iTime * 0.29 * speed)
  );
  vec2 w2 = vec2(
    vnoise(uv * 4.0 - iTime * 0.41 * speed),
    vnoise(uv * 4.0 + 23.7 - iTime * 0.37 * speed)
  );
  vec2 pw = uv * scale + swirl * 0.6 * (w1 - 0.5) + swirl * 0.3 * (w2 - 0.5);

  // Slight swirl by rotating proportional to noise
  float a =
    (vnoise(uv * 3.0 + iTime * 0.2 * speed) - 0.5) * 3.14159 * 0.25 * swirl;
  mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
  pw = R * pw;

  // Worley cell metrics
  vec2 F = worley(pw);
  float edge = clamp(F.y - F.x, 0.0, 1.0);

  // Ridge emphasis and sparkle
  float ridged = pow(edge, mix(0.8, 6.0, clamp(ridge * 0.5, 0.0, 1.0)));
  float spark =
    step(0.98, vnoise(pw * 6.0 + iTime * 1.7 * speed)) *
    0.5 *
    clamp(shimmer, 0.0, 2.0);
  float mask = clamp(ridged + spark, 0.0, 1.0);

  // Flow direction hue based on position and time
  float hue = fract(0.6 + 0.12 * iTime * speed + 0.25 * pw.x + 0.25 * pw.y);
  vec3 col = palette(hue, iPalette);

  // Saturation/Brightness
  float sat = clamp(iSaturation, 0.0, 2.0);
  float brt = clamp(iBrightness, 0.0, 2.0);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, sat);
  col *= brt;

  // Apply mask
  col *= mask;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}

