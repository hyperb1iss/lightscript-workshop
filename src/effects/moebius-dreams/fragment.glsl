/**
 * Moebius Dreams - Geometric Audio Visualizer
 *
 * Adapted from Shadertoy with audio-reactive wandering and time dilation.
 * Features Möbius circle inversions, spiral dots, and geometric wave patterns.
 */

uniform float iTime;
uniform vec2 iResolution;

// Control uniforms
uniform float iScale;
uniform float iGlowIntensity;
uniform float iRotationSpeed;
uniform int iColorScheme;
uniform float iBeatRotation;
uniform float iBeatZoom;

// Audio uniforms
uniform float iAudioLevel;
uniform float iAudioBass;
uniform float iAudioMid;
uniform float iAudioTreble;
uniform float iAudioBeat;
uniform float iAudioBeatPulse;
uniform float iAudioMomentum;
uniform float iAudioSwell;
uniform sampler2D iAudioSpectrum;

// State uniforms (persisted in TypeScript)
uniform vec2 iSmoothMouse;
uniform float iAudioTime;

#define PI radians(180.0)
#define TAU (PI * 2.0)
#define CS(a) vec2(cos(a), sin(a))
#define PT(u, r) smoothstep(0.0, r, r - length(u))

float saturate(float x) {
    return clamp(x, 0.0, 1.0);
}

float spectrumRange(float start, float end) {
    float sum = 0.0;
    for (int i = 0; i < 8; i++) {
        float t = float(i) / 7.0;
        float u = mix(start, end, t);
        sum += texture2D(iAudioSpectrum, vec2(u, 0.5)).r;
    }
    return sum / 8.0;
}

vec3 acesToneMap(vec3 x) {
    x = max(vec3(0.0), x);
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 preserveSaturation(vec3 color, float strength) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 delta = color - vec3(luma);
    float amt = clamp(strength, 0.0, 1.0);
    return clamp(vec3(luma) + delta * (1.0 + amt * 0.65), 0.0, 1.4);
}

// ─────────────────────────────────────────────────────────────
// Color Palettes
// ─────────────────────────────────────────────────────────────

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(TAU * (c * t + d));
}

vec3 getGoldBlue(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.0, 0.1, 0.2)
    );
    col += vec3(1.0, 0.6, 0.0) * pow(g, 2.0) * 0.4;
    col += vec3(0.2, 0.5, 1.0) * pow(1.0 - g, 2.0) * 0.35;
    return col * (0.7 + l * 0.3);
}

vec3 getCyberpunk(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.5, 0.3, 0.5),
        vec3(0.5, 0.4, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.8, 0.5, 0.3)
    );
    col += vec3(1.0, 0.0, 0.6) * pow(g, 1.5) * 0.5;
    col += vec3(0.0, 1.0, 1.0) * pow(1.0 - g, 1.5) * 0.4;
    col += vec3(0.4, 0.0, 0.6) * sin(g * PI * 3.0) * 0.25;
    return col * (0.65 + l * 0.35);
}

vec3 getAurora(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.3, 0.5, 0.4),
        vec3(0.4, 0.5, 0.5),
        vec3(1.5, 1.0, 1.0),
        vec3(0.1, 0.4, 0.6)
    );
    col += vec3(0.1, 1.0, 0.4) * pow(g, 2.0) * 0.4;
    col += vec3(0.6, 0.2, 0.9) * pow(1.0 - g, 2.0) * 0.35;
    col += vec3(0.0, 0.7, 0.7) * sin(g * PI * 2.0) * 0.25;
    float shimmer = sin(t * 2.0 + g * 8.0) * 0.1 + 0.1;
    col += vec3(1.0, 0.5, 0.8) * shimmer * g;
    return col * (0.6 + l * 0.35);
}

vec3 getLava(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.5, 0.3, 0.2),
        vec3(0.5, 0.4, 0.3),
        vec3(1.0, 0.8, 0.5),
        vec3(0.0, 0.05, 0.1)
    );
    col += vec3(0.4, 0.0, 0.0) * (1.0 - g) * 0.4;
    col += vec3(1.0, 0.4, 0.0) * pow(g, 1.5) * 0.5;
    col += vec3(1.0, 0.8, 0.2) * pow(g, 3.0) * 0.6;
    col += vec3(1.0, 1.0, 0.8) * pow(g, 5.0) * 0.35;
    return col * (0.55 + l * 0.45);
}

vec3 getIce(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.5, 0.6, 0.7),
        vec3(0.3, 0.3, 0.4),
        vec3(1.0, 1.0, 0.8),
        vec3(0.5, 0.6, 0.7)
    );
    col += vec3(0.1, 0.2, 0.6) * pow(1.0 - g, 2.0) * 0.4;
    col += vec3(0.3, 0.8, 1.0) * sin(g * PI) * 0.35;
    col += vec3(0.95, 1.0, 1.0) * pow(g, 2.0) * 0.5;
    col += vec3(1.0, 0.9, 0.95) * pow(g, 4.0) * 0.25;
    return col * (0.6 + l * 0.35);
}

vec3 getSynesthesia(float g, float l, float t) {
    float bass = iAudioBass;
    float mid = iAudioMid;
    float treble = iAudioTreble;

    vec3 col = palette(g + bass * 0.2,
        vec3(0.5, 0.4, 0.4),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0 + mid, 1.0, 1.0 + treble),
        vec3(bass * 0.3, 0.3, 0.5 + treble * 0.2)
    );

    col += vec3(0.9, 0.1, 0.2) * bass * pow(1.0 - g, 1.5) * 0.6;
    col += vec3(0.2, 0.9, 0.3) * mid * sin(g * PI) * 0.5;
    col += vec3(0.4, 0.2, 1.0) * treble * pow(g, 1.5) * 0.6;
    col += vec3(1.0, 0.6, 0.0) * (bass * treble) * 0.35;

    return col * (0.6 + l * 0.4);
}

vec3 getPhosphor(float g, float l, float t) {
    vec3 col = vec3(0.0);
    col += vec3(0.2, 1.0, 0.3) * pow(g, 1.2) * 0.7;
    col += vec3(0.1, 0.6, 0.2) * (1.0 - g) * 0.35;
    col += vec3(1.0, 0.7, 0.1) * pow(g, 2.5) * 0.25;
    col += vec3(0.2, 0.4, 0.8) * pow(1.0 - g, 3.0) * 0.18;
    float scan = sin(g * PI * 4.0) * 0.1 + 0.9;
    col *= scan;
    return col * (0.6 + l * 0.4);
}

vec3 getVaporwave(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.6, 0.4, 0.5),
        vec3(0.4, 0.4, 0.4),
        vec3(1.5, 1.0, 1.0),
        vec3(0.8, 0.5, 0.4)
    );
    col += vec3(1.0, 0.4, 0.7) * pow(g, 1.5) * 0.45;
    col += vec3(0.6, 0.2, 0.8) * sin(g * PI) * 0.35;
    col += vec3(0.2, 0.8, 0.8) * pow(1.0 - g, 1.5) * 0.35;
    col += vec3(1.0, 0.5, 0.2) * pow(1.0 - g, 3.0) * 0.25;
    col += vec3(0.2, 0.1, 0.3) * sin(t * 0.5 + g * 4.0) * 0.12;
    return col * (0.6 + l * 0.35);
}

vec3 getSchemeColor(float g, float l, float t) {
    if (iColorScheme == 0) return getGoldBlue(g, l, t);
    if (iColorScheme == 1) return getCyberpunk(g, l, t);
    if (iColorScheme == 2) return getAurora(g, l, t);
    if (iColorScheme == 3) return getLava(g, l, t);
    if (iColorScheme == 4) return getIce(g, l, t);
    if (iColorScheme == 5) return getSynesthesia(g, l, t);
    if (iColorScheme == 6) return getPhosphor(g, l, t);
    return getVaporwave(g, l, t);
}

// ─────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────

vec3 gm(vec3 c, float n, float t, float w, float d, bool i) {
    float g = min(abs(n), 1.0 / abs(n));
    float s = abs(sin(n * PI - t));
    if (i) s = min(s, abs(sin(PI / n + t)));
    return (1.0 - pow(abs(s), w)) * c * pow(g, d) * 6.0;
}

float ds(vec2 u, float e, float n, float w, float h, float ro) {
    float ur = length(u);
    float sr = pow(ur, e);
    float a = round(sr) * n * TAU;
    vec2 xy = CS(a + ro) * ur;
    float l = PT(u - xy, w);
    float s = mod(sr + 0.5, 1.0);
    s = min(s, 1.0 - s);
    return l * s * h;
}

mat2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 R = iResolution.xy;
    float t = iAudioTime;

    vec2 m = iSmoothMouse;
    t += m.y * iScale;

    float z = pow(1.0 - abs(m.y), sign(m.y));
    float e = pow(1.0 - abs(m.x), -sign(m.x));
    float se = e * -sign(m.y);

    vec2 uv = (fragCoord - 0.5 * R) / R.y * iScale * z;
    uv /= iBeatZoom;
    uv = exp(log(abs(uv) + 0.0001) * e) * sign(uv);

    float totalRotation = iBeatRotation + t * iRotationSpeed;
    uv = rot2(totalRotation) * uv;

    float px = max(length(fwidth(uv)), 0.0007);
    float x = uv.x;
    float y = uv.y;
    float l = length(uv);

    float mc = (x * x + y * y - 1.0) / y;
    float safeMc = max(abs(mc), 0.0001);
    float g = min(abs(mc), 1.0 / safeMc);

    float bassEnergy = spectrumRange(0.0, 0.15);
    float midEnergy = spectrumRange(0.2, 0.55);
    float trebleEnergy = spectrumRange(0.6, 0.95);
    float energyMix = clamp(bassEnergy * 0.5 + midEnergy * 0.35 + trebleEnergy * 0.25, 0.0, 1.4);

    float paletteShift = iAudioBeatPulse * 0.08 + iAudioMomentum * 0.05;
    vec3 rgb = getSchemeColor(fract(g + paletteShift), l * (1.0 + bassEnergy * 0.3), t + iAudioMid * 0.4);
    float audioBoost = 0.8 + iAudioLevel * 0.6 + iAudioBeatPulse * 0.4 + energyMix * 0.3;
    rgb *= audioBoost;

    float w = 0.06 + iAudioBeatPulse * 0.07 + bassEnergy * 0.05;
    float d = 0.25 + iAudioSwell * 0.25 + midEnergy * 0.2;

    vec3 c = vec3(0.0);
    c = max(c, gm(rgb, mc, -t, w, d, false));
    c = max(c, gm(rgb, (x * x) + (y * y), t, w, d, true));

    float ribbon = sin(atan(y, x) * 2.0 + t * (1.0 + trebleEnergy * 0.5));
    c += rgb * ribbon * 0.08 * (trebleEnergy + iAudioTreble * 0.3);

    float dotBeat = 0.8 + iBeatZoom * 0.6 + iAudioBeatPulse * 0.5;
    float dotSize = px * (1.5 + bassEnergy * 2.5) * dotBeat;
    c += rgb * ds(uv, se, t / TAU, dotSize, 2.2, 0.0) * (0.7 + bassEnergy);
    c += rgb * ds(uv, -se, t / TAU, dotSize, 2.2, PI) * (0.7 + trebleEnergy);

    float concentric = sin(l * 12.0 - t * (1.0 + midEnergy * 0.4));
    float concentricMask = smoothstep(0.6, 1.0, abs(concentric));
    c += rgb * concentricMask * 0.12 * (midEnergy + iAudioMid * 0.3);

    c = max(c, 0.0);

    float glowGain = clamp(iGlowIntensity, 0.05, 1.2);
    float glowFalloff = mix(6.0, 2.0, glowGain);
    float glow = exp(-l * glowFalloff) * glowGain;
    glow *= 0.4 + iAudioBeatPulse * 0.6 + energyMix * 0.5;
    c += rgb * glow;

    c = preserveSaturation(c, saturate(energyMix + iAudioMomentum * 0.5));
    c = acesToneMap(c);
    c = clamp(c, 0.0, 1.0);

    fragColor = vec4(c, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
