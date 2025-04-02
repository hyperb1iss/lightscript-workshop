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
vec3 getRainbow(float pos) { return hsv2rgb(vec3(pos, 0.8, 1.0)); }

vec3 getOcean(float pos) {
  return mix(vec3(0.0, 0.3, 0.8), vec3(0.0, 0.8, 1.0),
             sin(pos * 6.28) * 0.5 + 0.5);
}

vec3 getFire(float pos) {
  return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.2, 0.0),
             sin(pos * 6.28) * 0.5 + 0.5);
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

vec3 getMono(float pos) { return vec3(0.7 + 0.3 * sin(pos * 6.28)); }

vec3 getColorForMode(float pos, int mode) {
  if (mode == 1)
    return getOcean(pos);
  if (mode == 2)
    return getFire(pos);
  if (mode == 3)
    return getNeon(pos);
  if (mode == 4)
    return getMono(pos);
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
  float intensity =
      mix(0.1, 1.0, iColorIntensity); // Ensure some color even at low intensity

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

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }