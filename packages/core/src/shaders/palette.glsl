/**
 * Shared Color Palette System
 * 16 curated color palettes for RGB effects
 *
 * Usage: vec3 color = palette(t, paletteIndex);
 * where t is 0-1 (will be fractioned) and paletteIndex is 0-15
 */

// Main palette function with 16 modes
// Mode 0: Aurora (default) - Northern lights inspired
// Mode 1: Rainbow - Full spectrum
// Mode 2: Neon - Vibrant complementary
// Mode 3: Ocean - Cool blues and teals
// Mode 4: Fire - Warm oranges and reds
// Mode 5: Cyberpunk - Pink/cyan contrast
// Mode 6: Sunset - Warm gradient
// Mode 7: Candy - Pastel rainbow
// Mode 8: Pastel - Soft muted tones
// Mode 9: Forest - Greens and earth
// Mode 10: Heatmap - Scientific visualization
// Mode 11: Viridis - Perceptually uniform
// Mode 12: Inferno - Hot to cool
// Mode 13: Plasma - Purple to yellow
// Mode 14: Magma - Dark to bright
// Mode 15: Mono - Grayscale
vec3 palette(float t, int mode) {
    t = fract(t);

    // Aurora (default)
    if (mode == 0) {
        return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.1, 0.2)));
    }
    // Rainbow
    if (mode == 1) {
        vec3 hsv = vec3(t, 0.95, 1.0);
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
        return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
    }
    // Neon
    if (mode == 2) {
        return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
    }
    // Ocean
    if (mode == 3) {
        return mix(vec3(0.0, 0.2, 0.5), vec3(0.0, 0.9, 1.0), t);
    }
    // Fire
    if (mode == 4) {
        return mix(vec3(0.2, 0.0, 0.0), vec3(1.0, 0.6, 0.0), smoothstep(0.0, 1.0, t));
    }
    // Cyberpunk
    if (mode == 5) {
        return mix(vec3(1.0, 0.0, 0.8), vec3(0.0, 1.0, 1.0), t);
    }
    // Sunset
    if (mode == 6) {
        return mix(vec3(0.9, 0.2, 0.0), vec3(1.0, 0.8, 0.2), t);
    }
    // Candy
    if (mode == 7) {
        return 0.5 + 0.5 * cos(6.28318 * (t * 0.5 + vec3(0.0, 0.15, 0.35)));
    }
    // Pastel
    if (mode == 8) {
        return mix(vec3(0.9, 0.8, 1.0), vec3(0.8, 1.0, 0.9), t);
    }
    // Forest
    if (mode == 9) {
        return mix(vec3(0.0, 0.2, 0.0), vec3(0.2, 0.9, 0.3), t);
    }
    // Heatmap
    if (mode == 10) {
        vec3 hsv = vec3(0.05 + 0.95 * t, 1.0, 1.0);
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
        return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
    }
    // Viridis
    if (mode == 11) {
        return mix(vec3(0.267, 0.004, 0.329), vec3(0.993, 0.906, 0.144), t);
    }
    // Inferno
    if (mode == 12) {
        return mix(vec3(0.001, 0.000, 0.014), vec3(0.988, 0.998, 0.644), t);
    }
    // Plasma
    if (mode == 13) {
        return mix(vec3(0.050, 0.030, 0.527), vec3(0.940, 0.975, 0.131), t);
    }
    // Magma
    if (mode == 14) {
        return mix(vec3(0.001, 0.000, 0.016), vec3(0.987, 0.730, 0.258), t);
    }
    // Mono
    if (mode == 15) {
        return vec3(t);
    }

    // Fallback to Aurora
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.1, 0.2)));
}

// IQ-style procedural palette generator
// See: https://iquilezles.org/articles/palettes/
// a: bias, b: amplitude, c: frequency, d: phase
vec3 iqPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

// Preset IQ palettes
vec3 iqPaletteRainbow(float t) {
    return iqPalette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
}

vec3 iqPaletteSunset(float t) {
    return iqPalette(t, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.2));
}

vec3 iqPaletteCyberpunk(float t) {
    return iqPalette(t, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3));
}
