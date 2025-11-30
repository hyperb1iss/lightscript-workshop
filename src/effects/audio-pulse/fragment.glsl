/**
 * Audio Pulse — Fragment Shader
 * Audio reactive visualization with multiple styles
 */

// Standard uniforms
uniform float iTime;
uniform vec2 iResolution;

// Control uniforms
uniform float iSensitivity;
uniform float iSmoothing;
uniform float iBassBoost;
uniform float iColorSpeed;
uniform int iRingCount;
uniform float iGlowIntensity;
uniform int iVisualStyle;

// Audio uniforms (provided by audioReactive: true)
uniform float iAudioLevel;      // 0-1 normalized level
uniform float iAudioBass;       // 0-1 bass level
uniform float iAudioMid;        // 0-1 mid level
uniform float iAudioTreble;     // 0-1 treble level
uniform float iAudioDensity;    // 0-1 tone density
uniform sampler2D iAudioSpectrum; // 256x1 spectrum texture

// ─────────────────────────────────────────────────────────────
// Color utilities
// ─────────────────────────────────────────────────────────────

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Get frequency value from spectrum texture
float getFreq(float index) {
    return texture2D(iAudioSpectrum, vec2(index / 200.0, 0.5)).r;
}

// Smooth step with glow falloff
float glow(float d, float radius, float intensity) {
    return intensity / (d * d + radius);
}

// ─────────────────────────────────────────────────────────────
// Visualization Styles
// ─────────────────────────────────────────────────────────────

// Style 0: Radial rings pulsing with frequency bands
vec3 radialStyle(vec2 uv, float t) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);

    vec3 color = vec3(0.0);
    float rings = float(iRingCount);

    for (int i = 0; i < 16; i++) {
        if (i >= iRingCount) break;

        float fi = float(i);
        float freqIndex = fi / rings;
        float freq = getFreq(freqIndex * 150.0) * iSensitivity;

        // Ring radius based on frequency
        float baseRadius = 0.1 + fi * 0.05;
        float radius = baseRadius + freq * 0.15;

        // Ring with thickness
        float ring = abs(dist - radius);
        float thickness = 0.02 + freq * 0.02;
        float ringAlpha = smoothstep(thickness, 0.0, ring);

        // Color based on frequency band and time
        float hue = fract(freqIndex + t * iColorSpeed * 0.1);
        vec3 ringColor = hsv2rgb(vec3(hue, 0.8, 1.0));

        // Add glow
        float glowAmount = glow(ring, 0.01, 0.01 * iGlowIntensity * freq);

        color += ringColor * (ringAlpha + glowAmount);
    }

    // Bass boost center pulse
    float bassRadius = 0.05 + iAudioBass * iBassBoost * 0.1;
    float bassPulse = glow(dist, bassRadius * 0.5, 0.02 * iGlowIntensity);
    vec3 bassColor = hsv2rgb(vec3(fract(t * iColorSpeed * 0.05), 1.0, 1.0));
    color += bassColor * bassPulse * iAudioBass;

    return color;
}

// Style 1: Vertical bars spectrum analyzer
vec3 barsStyle(vec2 uv, float t) {
    vec3 color = vec3(0.0);

    int barCount = iRingCount * 4;
    float barWidth = 1.0 / float(barCount);

    for (int i = 0; i < 64; i++) {
        if (i >= barCount) break;

        float fi = float(i);
        float barX = fi * barWidth;

        // Get frequency for this bar
        float freqIndex = fi / float(barCount);
        float freq = getFreq(freqIndex * 180.0) * iSensitivity;

        // Apply bass boost to lower frequencies
        if (freqIndex < 0.2) {
            freq *= 1.0 + iBassBoost * 0.5;
        }

        // Bar height
        float height = freq * 0.8;

        // Check if pixel is inside bar
        float inBarX = step(barX, uv.x) * step(uv.x, barX + barWidth * 0.8);
        float inBarY = step(uv.y, height);

        // Color gradient
        float hue = fract(freqIndex + t * iColorSpeed * 0.1);
        vec3 barColor = hsv2rgb(vec3(hue, 0.9, 0.8 + freq * 0.2));

        // Glow at top of bar
        float glowDist = abs(uv.y - height);
        float barGlow = glow(glowDist, 0.02, 0.005 * iGlowIntensity) * inBarX;

        color += barColor * inBarX * inBarY;
        color += barColor * barGlow * freq;
    }

    return color;
}

// Style 2: Waveform with audio modulation
vec3 waveStyle(vec2 uv, float t) {
    vec3 color = vec3(0.0);

    // Multiple wave layers
    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        float layerOffset = fl * 0.15;

        // Wave frequency based on audio
        float waveFreq = 3.0 + iAudioMid * 5.0 + fl * 2.0;
        float waveAmp = 0.1 + iAudioLevel * 0.2 * iSensitivity;

        // Bass boost affects amplitude
        if (layer == 0) {
            waveAmp *= 1.0 + iAudioBass * iBassBoost * 0.5;
        }

        // Calculate wave
        float wave = sin(uv.x * waveFreq * 6.28 + t * 2.0 + layerOffset * 10.0) * waveAmp;
        wave += sin(uv.x * waveFreq * 3.14 + t * 3.0) * waveAmp * 0.5;

        // Distance to wave
        float centerY = 0.5 + wave;
        float dist = abs(uv.y - centerY);

        // Wave line with glow
        float lineAlpha = smoothstep(0.02, 0.0, dist);
        float glowAmount = glow(dist, 0.01, 0.01 * iGlowIntensity);

        // Color
        float hue = fract(uv.x + fl * 0.2 + t * iColorSpeed * 0.1);
        vec3 waveColor = hsv2rgb(vec3(hue, 0.8, 0.9));

        color += waveColor * (lineAlpha + glowAmount) * (1.0 - fl * 0.2);
    }

    return color;
}

// Style 3: Circular spectrum with radial bars
vec3 circularStyle(vec2 uv, float t) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);
    float normAngle = (angle + 3.14159) / 6.28318; // 0-1

    vec3 color = vec3(0.0);

    // Number of segments
    int segments = iRingCount * 8;
    float segmentWidth = 1.0 / float(segments);

    // Find which segment we're in
    float segmentIndex = floor(normAngle * float(segments));
    float freqIndex = segmentIndex / float(segments);

    // Get frequency for this segment
    float freq = getFreq(freqIndex * 180.0) * iSensitivity;

    // Apply bass boost
    if (freqIndex < 0.15) {
        freq *= 1.0 + iBassBoost * 0.5;
    }

    // Inner and outer radius
    float innerRadius = 0.15;
    float outerRadius = innerRadius + freq * 0.3;

    // Check if in bar
    float inRadius = step(innerRadius, dist) * step(dist, outerRadius);

    // Segment edges (soft)
    float segmentAngle = normAngle * float(segments);
    float edgeDist = abs(fract(segmentAngle) - 0.5) * 2.0;
    float edgeMask = smoothstep(0.0, 0.3, edgeDist);

    // Color
    float hue = fract(freqIndex + t * iColorSpeed * 0.1);
    vec3 barColor = hsv2rgb(vec3(hue, 0.9, 0.9));

    color += barColor * inRadius * edgeMask;

    // Glow at outer edge
    float glowDist = abs(dist - outerRadius);
    float edgeGlow = glow(glowDist, 0.02, 0.01 * iGlowIntensity) * edgeMask;
    color += barColor * edgeGlow * freq;

    // Center glow with bass
    float centerGlow = glow(dist, 0.05, 0.02 * iGlowIntensity * iAudioBass * iBassBoost);
    vec3 bassColor = hsv2rgb(vec3(fract(t * iColorSpeed * 0.05), 1.0, 1.0));
    color += bassColor * centerGlow;

    return color;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;

    vec3 color = vec3(0.0);

    // Select visualization style
    if (iVisualStyle == 0) {
        color = radialStyle(uv, t);
    } else if (iVisualStyle == 1) {
        color = barsStyle(uv, t);
    } else if (iVisualStyle == 2) {
        color = waveStyle(uv, t);
    } else {
        color = circularStyle(uv, t);
    }

    // Global audio level modulation on brightness
    color *= 0.5 + iAudioLevel * 0.5;

    // Tone mapping
    color = color / (1.0 + color);

    // Slight vignette
    float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.5;
    color *= vignette;

    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
