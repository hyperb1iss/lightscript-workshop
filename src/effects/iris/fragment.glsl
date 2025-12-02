/**
 * Iris - Geometric Audio Visualizer
 *
 * Adapted from Shadertoy with audio-reactive wandering and time dilation.
 * Features Möbius circle inversions, spiral dots, and geometric wave patterns.
 */

uniform float iTime;
uniform vec2 iResolution;

// Control uniforms
uniform float iScale;
uniform float iGlowIntensity;
uniform float iIrisStrength;
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

// Enhanced audio analysis uniforms
uniform float iHarmonicHue;       // Dominant pitch mapped to hue (0-1)
uniform float iHarmonicMix;       // Blend factor for harmonic coloring
uniform float iChordMood;         // -1 = minor, +1 = major
uniform float iOnsetPulse;        // Sharp onset transient
uniform float iBeatAnticipation;  // Pre-beat "suck in" factor
uniform float iBrightness;        // Spectral centroid / brightness
uniform float iRoughness;         // Spectral roughness / dissonance
uniform float iFluxBass;          // Spectral flux in bass band
uniform float iFluxMid;           // Spectral flux in mid band
uniform float iFluxTreble;        // Spectral flux in treble band

// State uniforms (persisted in TypeScript)
uniform vec2 iSmoothMouse;
uniform float iAudioTime;
uniform float iRadialFlow;      // Accumulated radial distance for tunnel effect
uniform float iFlowVelocity;    // Current flow speed
uniform float iCorePulse;
uniform float iFlowDrive;
uniform float iColorAccent;
uniform float iColorContrast;
uniform float iBandSharpness;
uniform float iBPM;
uniform float iParticleDensity;
uniform float iParticleSize;
uniform float iParticleColorMix;

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

float blendDetail(float derivative) {
    return smoothstep(0.0, 0.08, derivative);
}

// ─────────────────────────────────────────────────────────────
// Color Palettes
// ─────────────────────────────────────────────────────────────

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(TAU * (c * t + d));
}

vec3 getGoldBlue(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.35, 0.35, 0.35),
        vec3(0.45, 0.4, 0.35),
        vec3(1.0, 0.9, 0.8),
        vec3(0.0, 0.1, 0.2)
    );
    col += vec3(0.9, 0.4, 0.0) * pow(g, 2.0) * 0.3;
    col += vec3(0.1, 0.4, 0.9) * pow(1.0 - g, 2.0) * 0.3;
    return col * (0.45 + l * 0.35);
}

vec3 getCyberpunk(float g, float l, float t) {
    vec3 deepBase = vec3(0.005, 0.002, 0.01);
    vec3 magenta = vec3(0.55, 0.05, 0.4);
    vec3 cyan = vec3(0.0, 0.3, 0.55);
    vec3 blue = vec3(0.03, 0.08, 0.3);
    vec3 neonGreen = vec3(0.08, 0.7, 0.12);
    vec3 neonYellow = vec3(0.98, 0.8, 0.1);

    float sweep = smoothstep(0.15, 0.85, g);
    vec3 gradient = mix(magenta, cyan, sweep);
    vec3 col = mix(blue, gradient, 0.3 + l * 0.2);
    float glitch = sin(t * 0.6 + g * 7.0);
    col += vec3(0.05, 0.0, 0.12) * glitch;

    float greenPulse = clamp(iAudioBass * 0.2 + iAudioBeatPulse * 0.15, 0.0, 0.3);
    col += neonGreen * greenPulse;

    float yellowPulse = clamp(iAudioTreble * 0.3 + iAudioMomentum * 0.25, 0.0, 0.45);
    col += neonYellow * yellowPulse;

    col = mix(col, deepBase, 0.4);
    return mix(deepBase, col, 0.55);
}

vec3 getAurora(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.2, 0.35, 0.3),
        vec3(0.35, 0.45, 0.45),
        vec3(1.1, 0.8, 0.9),
        vec3(0.1, 0.4, 0.5)
    );
    col += vec3(0.05, 0.8, 0.3) * pow(g, 2.0) * 0.3;
    col += vec3(0.5, 0.15, 0.8) * pow(1.0 - g, 2.0) * 0.3;
    col += vec3(0.0, 0.5, 0.6) * sin(g * PI * 2.0) * 0.2;
    float shimmer = sin(t * 1.5 + g * 6.0) * 0.08 + 0.08;
    col += vec3(1.0, 0.5, 0.8) * shimmer * g;
    return col * (0.4 + l * 0.35);
}

vec3 getLava(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.35, 0.2, 0.15),
        vec3(0.45, 0.35, 0.25),
        vec3(0.9, 0.6, 0.35),
        vec3(0.0, 0.05, 0.1)
    );
    col += vec3(0.35, 0.0, 0.0) * (1.0 - g) * 0.35;
    col += vec3(0.9, 0.3, 0.0) * pow(g, 1.5) * 0.4;
    col += vec3(0.9, 0.6, 0.2) * pow(g, 3.0) * 0.45;
    return col * (0.4 + l * 0.4);
}

vec3 getIce(float g, float l, float t) {
    vec3 col = palette(g,
        vec3(0.3, 0.35, 0.45),
        vec3(0.3, 0.3, 0.35),
        vec3(0.9, 0.9, 0.7),
        vec3(0.3, 0.4, 0.5)
    );
    col += vec3(0.05, 0.1, 0.5) * pow(1.0 - g, 2.0) * 0.3;
    col += vec3(0.2, 0.6, 0.9) * sin(g * PI) * 0.3;
    col += vec3(0.8, 0.9, 1.0) * pow(g, 2.0) * 0.35;
    return col * (0.45 + l * 0.35);
}

vec3 getSynesthesia(float g, float l, float t) {
    float bass = iAudioBass;
    float mid = iAudioMid;
    float treble = iAudioTreble;

    vec3 col = palette(g + bass * 0.2,
        vec3(0.35, 0.25, 0.25),
        vec3(0.4, 0.4, 0.45),
        vec3(1.0 + mid, 1.0, 1.0 + treble),
        vec3(bass * 0.3, 0.3, 0.5 + treble * 0.2)
    );

    col += vec3(0.7, 0.05, 0.15) * bass * pow(1.0 - g, 1.5) * 0.4;
    col += vec3(0.15, 0.7, 0.2) * mid * sin(g * PI) * 0.35;
    col += vec3(0.3, 0.15, 0.8) * treble * pow(g, 1.5) * 0.45;
    col += vec3(0.8, 0.4, 0.0) * (bass * treble) * 0.25;

    return col * (0.45 + l * 0.35);
}

vec3 getPhosphor(float g, float l, float t) {
    vec3 green = vec3(0.15, 0.8, 0.2);
    vec3 blue = vec3(0.05, 0.2, 0.8);
    vec3 magenta = vec3(0.8, 0.1, 0.6);
    vec3 col = mix(green, blue, pow(1.0 - g, 2.0));
    col += magenta * clamp(iAudioTreble * 0.25 + iAudioBeatPulse * 0.15, 0.0, 0.3);
    col += blue * clamp(iAudioMid * 0.15, 0.0, 0.2);
    float scan = sin(g * PI * 4.0 + t) * 0.1 + 0.85;
    col *= scan;
    return mix(vec3(0.02, 0.03, 0.05), col, 0.7 + l * 0.2);
}

vec3 getVaporwave(float g, float l, float t) {
    vec3 purple = vec3(0.4, 0.1, 0.4);
    vec3 cyan = vec3(0.0, 0.4, 0.8);
    vec3 sunset = vec3(0.9, 0.3, 0.3);
    vec3 col = mix(purple, cyan, smoothstep(0.2, 0.8, g));
    col = mix(col, sunset, clamp(iAudioBass * 0.25, 0.0, 0.3));
    col += vec3(0.15, 0.05, 0.2) * sin(t * 0.3 + g * 3.0);
    return mix(vec3(0.03, 0.02, 0.05), col, 0.65 + l * 0.25);
}

vec3 getNeonFlux(float g, float l, float t) {
    vec3 magenta = vec3(0.92, 0.08, 0.75);
    vec3 teal = vec3(0.0, 0.75, 0.75);
    vec3 amber = vec3(0.9, 0.45, 0.1);

    float bassMix = clamp(iAudioBass * 1.2, 0.0, 1.0);
    float trebleMix = clamp(iAudioTreble * 1.1, 0.0, 1.0);
    float sweep = smoothstep(0.05, 0.95, fract(g + iAudioMomentum * 0.2));

    vec3 base = mix(magenta, teal, sweep);
    vec3 accent = mix(amber, teal, bassMix);
    vec3 color = mix(base, accent, 0.35 + bassMix * 0.25);
    color += magenta * trebleMix * 0.2;
    color = clamp(color, 0.0, 0.95);
    return mix(vec3(0.05, 0.02, 0.08), color, 0.8 + l * 0.15);
}

vec3 getMidnightFlux(float g, float l, float t) {
    vec3 violet = vec3(0.6, 0.1, 0.8);
    vec3 blue = vec3(0.0, 0.25, 0.85);
    vec3 emerald = vec3(0.0, 0.5, 0.35);

    float flow = sin(t * 0.4 + g * 3.0) * 0.5 + 0.5;
    vec3 base = mix(violet, blue, flow);
    base = mix(base, emerald, clamp(iAudioLevel * 1.2, 0.0, 0.5));

    float pulse = clamp(iAudioMid * 0.7 + iAudioTreble * 0.4, 0.0, 0.8);
    base += vec3(0.2, 0.05, 0.3) * pulse;
    return base * (0.35 + l * 0.4);
}

vec3 getSolarStorm(float g, float l, float t) {
    vec3 ember = vec3(0.95, 0.35, 0.05);
    vec3 brass = vec3(0.7, 0.45, 0.1);
    vec3 teal = vec3(0.0, 0.45, 0.55);

    float sweep = fract(g + t * 0.05 + iAudioMomentum * 0.1);
    vec3 base = mix(ember, brass, smoothstep(0.2, 0.8, sweep));
    base = mix(base, teal, clamp(iAudioBass * 0.8, 0.0, 0.5));

    float flicker = 0.2 + 0.4 * sin(t * 1.2 + g * 6.0);
    base += vec3(0.1, 0.05, 0.0) * flicker;
    return base * (0.4 + l * 0.45);
}

// Circle of Fifths harmonic color scheme
// Uses chromagram analysis to derive musically coherent colors
vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

vec3 getHarmonic(float g, float l, float t) {
    // Base hue from chromagram analysis (circle of fifths mapped)
    float baseHue = iHarmonicHue;

    // Shift hue across the geometry for variation
    float hueSpread = 0.15 + iRoughness * 0.1;
    float hue = fract(baseHue + g * hueSpread);

    // Saturation: higher on beats, reduced during minor chords for moodiness
    float sat = 0.6 + iOnsetPulse * 0.25 + iFluxMid * 0.15;
    sat *= 0.85 + iChordMood * 0.15; // Major = more saturated, minor = more muted
    sat = clamp(sat, 0.3, 0.95);

    // Lightness: brighter core, modulated by spectral brightness
    float lit = 0.35 + l * 0.25 + iBrightness * 0.15;
    lit += iOnsetPulse * 0.15;
    lit = clamp(lit, 0.2, 0.7);

    vec3 col = hsl2rgb(hue, sat, lit);

    // Warm/cool temperature shift based on chord mood
    // Major chords → warmer (toward orange), minor → cooler (toward blue)
    vec3 warm = vec3(1.1, 0.95, 0.85);
    vec3 cool = vec3(0.85, 0.95, 1.1);
    vec3 temperature = mix(cool, warm, iChordMood * 0.5 + 0.5);
    col *= temperature;

    // Add complementary accent on treble transients
    float complement = fract(hue + 0.5);
    vec3 accentCol = hsl2rgb(complement, 0.7, 0.5);
    col += accentCol * iFluxTreble * 0.2;

    return col;
}

vec3 getSchemeColor(float g, float l, float t) {
    // Harmonic mode: blend between base palette and chromagram-derived colors
    if (iColorScheme == 0) {
        vec3 base = getGoldBlue(g, l, t);
        vec3 harmonic = getHarmonic(g, l, t);
        return mix(base, harmonic, iHarmonicMix);
    }
    if (iColorScheme == 1) return getGoldBlue(g, l, t);
    if (iColorScheme == 2) return getCyberpunk(g, l, t);
    if (iColorScheme == 3) return getAurora(g, l, t);
    if (iColorScheme == 4) return getLava(g, l, t);
    if (iColorScheme == 5) return getIce(g, l, t);
    if (iColorScheme == 6) return getSynesthesia(g, l, t);
    if (iColorScheme == 7) return getPhosphor(g, l, t);
    if (iColorScheme == 8) return getVaporwave(g, l, t);
    if (iColorScheme == 9) return getNeonFlux(g, l, t);
    if (iColorScheme == 10) return getMidnightFlux(g, l, t);
    return getSolarStorm(g, l, t);
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

    float baseY = clamp(1.0 - abs(m.y), 0.05, 1.0);
    float baseX = clamp(1.0 - abs(m.x), 0.05, 1.0);
    float ySign = sign(m.y);
    if (ySign == 0.0) ySign = 1.0;
    float z = pow(baseY, ySign);
    float e = pow(baseX, -sign(m.x));
    float se = e * -ySign;

    vec2 uv = (fragCoord - 0.5 * R) / R.y * iScale * z;
    uv /= iBeatZoom;

    // Beat anticipation: subtle "suck in" before the beat hits
    float anticipationScale = 1.0 + iBeatAnticipation * 0.08;
    uv *= anticipationScale;

    uv = exp(log(abs(uv) + 0.0001) * e) * sign(uv);

    // Rotation controlled entirely by TypeScript - no additional audio jitter here
    float totalRotation = iBeatRotation;
    uv = rot2(totalRotation) * uv;

    float px = max(length(fwidth(uv)), 0.0007);

    // Spiral flow - combines radial motion with rotation for dynamic movement
    float rawL = length(uv);
    float angle = atan(uv.y, uv.x);

    // Spiral twist driven by flow velocity (smooth, not jerky)
    float spiralTwist = iRadialFlow * 0.25 / (rawL + 0.4);
    float flowAngle = angle + spiralTwist;

    // Radial warp varies with angle - breaks circular symmetry
    float radialWarp = 1.0 + sin(angle * 3.0 + iRadialFlow * 0.5) * 0.06 * iFlowVelocity;
    vec2 flowedUV = vec2(cos(flowAngle), sin(flowAngle)) * rawL * radialWarp;

    // Blend smoothly based on flow intensity
    float flowBlend = clamp(iFlowVelocity * 0.7, 0.0, 0.5);
    uv = mix(uv, flowedUV, flowBlend);

    // Additional folding based on audio
    float foldStrength = 0.15 + iAudioMomentum * 0.1 + iOnsetPulse * 0.2;
    mat2 foldMat = mat2(1.0, foldStrength, foldStrength * -0.6, 1.0);
    vec2 foldUV = foldMat * uv;
    float x = foldUV.x;
    float y = foldUV.y;
    float l = length(uv);

    float ySafe = y;
    if (abs(ySafe) < 0.06) {
        ySafe = (ySafe >= 0.0 ? 1.0 : -1.0) * 0.06;
    }

    // Standard Möbius inversion - spiral flow already applied to UV
    float mc = (x * x + y * y - 1.0) / ySafe;
    float safeMc = max(abs(mc), 0.0001);
    float g = min(abs(mc), 1.0 / safeMc);

    // Subtle flow offset on the bands - varies with angle to avoid circles
    float bandFlow = iRadialFlow * 0.3 + sin(angle * 2.0 + iRadialFlow) * 0.1;
    float gFlowed = fract(g + bandFlow);

    float derivative = max(max(fwidth(uv.x), fwidth(uv.y)), fwidth(mc));

    float bassEnergy = spectrumRange(0.0, 0.15);
    float midEnergy = spectrumRange(0.2, 0.55);
    float trebleEnergy = spectrumRange(0.6, 0.95);
    float energyMix = clamp(bassEnergy * 0.5 + midEnergy * 0.35 + trebleEnergy * 0.25, 0.0, 1.4);

    // Blend spectral flux for sharper transient response
    float fluxEnergy = iFluxBass * 0.5 + iFluxMid * 0.3 + iFluxTreble * 0.2;

    float irisStrength = clamp(iIrisStrength, 0.2, 4.0);
    float corePulse = clamp(iCorePulse, 0.1, 3.0);
    float flowDrive = clamp(iFlowDrive, 0.2, 2.5);

    // Use onset pulse for crisp beat response instead of smoothed beat pulse
    float beatPush = (0.1 + iOnsetPulse * 0.5 + iAudioBass * 0.15) * flowDrive;

    float paletteShift = iOnsetPulse * 0.1 + iAudioMomentum * 0.05 + iHarmonicHue * 0.02;
    // Use gFlowed for streaming color bands
    vec3 rgb = getSchemeColor(fract(gFlowed + paletteShift), l * (1.0 + bassEnergy * 0.3), t + iAudioMid * 0.4);

    // Audio boost with onset pulse for punch and spectral brightness for shimmer
    float audioBoost = 0.8 + iAudioLevel * 0.5 + iOnsetPulse * 0.5 + energyMix * 0.25 + iBrightness * 0.15;
    rgb *= audioBoost;

    float bandSharp = clamp(iBandSharpness, 0.4, 2.5);
    float w = (0.06 + iOnsetPulse * 0.08 + iFluxBass * 0.06) * bandSharp;
    float d = 0.25 + iAudioSwell * 0.25 + iFluxMid * 0.25;

    vec3 c = vec3(0.0);
    c = max(c, gm(rgb, mc, -t, w, d, false));
    c = max(c, gm(rgb, (x * x) + (y * y), t, w, d, true));

    // Ribbon responds to treble flux for sharp high-frequency transients
    float ribbon = sin(atan(y, x) * 2.0 + t * (1.0 + trebleEnergy * 0.5));
    c += rgb * ribbon * 0.08 * (trebleEnergy + iFluxTreble * 0.4);

    // Dots pulse with bass flux for tight kick drum response
    float dotBeat = 0.8 + iBeatZoom * 0.6 + iOnsetPulse * 0.6;
    float dotGuard = clamp(0.35 / (px + 1e-3), 0.8, 2.4);
    float dotSize = px * (1.5 + iFluxBass * 3.0) * dotBeat * dotGuard;
    c += rgb * ds(uv, se, t / TAU, dotSize, 2.2, 0.0) * (0.7 + iFluxBass);
    c += rgb * ds(uv, -se, t / TAU, dotSize, 2.2, PI) * (0.7 + iFluxTreble);

    // Particle system with roughness-driven turbulence
    vec2 particleUV = uv * (1.0 + flowDrive * 0.5);
    float particleAngle = atan(particleUV.y, particleUV.x);
    float particleRadius = length(particleUV);
    float streakPhase = fract(particleRadius - t * 0.5);
    float turbulence = 8.0 + iRoughness * 4.0; // More chaotic when music is rough
    float particleNoise = sin(particleAngle * turbulence + t * 1.2 + particleRadius * 6.0);
    float particleMask = smoothstep(0.08, 0.0, abs(fract(particleNoise) - 0.5));
    particleMask *= smoothstep(0.0, 0.8, 1.0 - particleRadius);
    float densityControl = clamp(iParticleDensity, 0.05, 3.0);
    particleMask *= smoothstep(0.0, 1.0, densityControl);
    particleMask *= smoothstep(0.0, 1.0, streakPhase);
    float hueShift = clamp(iParticleColorMix, 0.05, 1.2);
    vec3 particleColor = mix(rgb, getSchemeColor(fract(g * (0.2 + hueShift) - particleNoise * 0.05), l * 0.3, t + hueShift), hueShift);
    float particleEnergy = (0.25 + iOnsetPulse * 0.4 + iFluxTreble * 0.3) * densityControl;
    particleMask *= clamp(iParticleSize, 0.2, 2.0);
    c += particleColor * particleMask * particleEnergy;

    // Outward beat rings triggered by onset detection
    float tempo = max(iBPM, 0.5);
    float ringPhase = fract(t * tempo * 0.1 + iAudioBeat * 0.5);
    float ringRadius = ringPhase * (1.2 + flowDrive * 0.4);
    float ringWidth = 0.03 + iOnsetPulse * 0.05;
    float ring = smoothstep(ringWidth, 0.0, abs(l - ringRadius));
    vec3 ringColor = mix(rgb, getSchemeColor(fract(g * 0.5 + ringPhase), l, t), 0.4);
    c += ringColor * ring * (0.2 + iOnsetPulse * 0.5);

    // Core pulse column driven by bass flux for tight kick response
    float coreWidth = 0.12 + corePulse * 0.05;
    float core = exp(-pow(uv.x * corePulse, 2.0) / max(coreWidth, 0.05)) * exp(-l * 0.8);
    float coreBeat = 0.8 + iOnsetPulse * 0.8 + iFluxBass * 0.6;
    vec2 flowUv = uv * mat2(0.8, -0.6, 0.6, 0.8) + vec2(flowDrive * t * 0.2, t * (0.15 + beatPush * 0.05 + tempo * 0.02));
    float vascular = sin(flowUv.x * (8.0 + corePulse * 2.0) + t * (0.9 + iFluxBass)) *
        sin(flowUv.y * (6.0 + iFluxMid * 5.0) - t * (0.4 + flowDrive * 0.2));
    float vascularMask = smoothstep(-0.3, 0.6, vascular);
    vec3 coreColor = getSchemeColor(fract(0.5 + paletteShift * 0.5 + vascular * 0.05), l * 0.2, t * 0.7);
    vec3 coreTexture = mix(coreColor, rgb, 0.3);
    c += coreTexture * (core * 0.6 + vascularMask * 0.2) * coreBeat * (0.25 + corePulse * 0.18);

    // Iris ripples driven by mid-frequency flux - spiral flow adds movement
    float irisFrequency = 8.0 + irisStrength * 6.0 + iFluxBass * 4.0;
    float irisFlowOffset = iRadialFlow * 0.8 + flowDrive * 0.6 + iBeatZoom * 0.2;
    float irisTemporal = 0.5 + flowDrive * 0.4 + iFluxMid * 0.6 + iOnsetPulse * 0.3;
    // Add angular variation to iris flow so it's not just circles
    float irisAngleWarp = sin(angle * 3.0 + iRadialFlow * 0.4) * 0.15;
    float irisWave = sin((l + irisFlowOffset + irisAngleWarp + beatPush) * irisFrequency - t * irisTemporal - iBeatRotation * 0.35);
    float irisMask = smoothstep(0.35, 0.95, abs(irisWave));
    float irisFeather = exp(-abs(irisWave) * (2.0 + irisStrength));
    float irisEnergy = (iFluxMid + iAudioMid * 0.25 + irisStrength * 0.1 + flowDrive * 0.2);
    c += rgb * irisMask * 0.18 * irisEnergy;
    c += rgb * irisFeather * 0.12 * (iFluxBass + 0.3);

    c = max(c, 0.0);

    float detailFactor = blendDetail(derivative);
    c = mix(rgb * (0.55 + energyMix * 0.2), c, detailFactor);
    float lowStructure = clamp(1.0 - detailFactor, 0.0, 1.0);
    vec3 fallback = getSchemeColor(fract(uv.x * 0.08 + uv.y * 0.12 + paletteShift * 0.2 + t * 0.02), l * 0.3 + 0.15, t * 0.2);
    c = mix(c, fallback, lowStructure * 0.25);

    // Chromatic aberration accent - more pronounced on bright, high-freq transients
    float aberration = (0.002 + flowDrive * 0.001) + iFluxTreble * 0.002 + iBrightness * 0.001;
    vec3 fringeR = getSchemeColor(fract(g + aberration), l, t);
    vec3 fringeB = getSchemeColor(fract(g - aberration), l, t);
    vec3 aberrated = vec3(fringeR.r, c.g, fringeB.b);
    c = mix(c, aberrated, 0.25 + iFluxTreble * 0.3);

    float contrast = clamp(iColorContrast, 0.6, 2.3);
    vec3 centered = c - vec3(0.5);
    c = centered * contrast + vec3(0.5);
    float accent = clamp(iColorAccent, 0.5, 1.8);
    c = mix(c, normalize(c + 1e-4) * accent * 0.7 + c * 0.3, 0.4);

    vec2 fabricUv = uv * (0.65 + iScale * 0.2);
    float weaveA = sin(dot(fabricUv, vec2(1.7, -1.2)) + t * (0.4 + midEnergy * 0.6));
    float weaveB = sin(dot(fabricUv, vec2(-2.3, 1.15)) - t * (0.35 + trebleEnergy * 0.5));
    float weave = (weaveA + weaveB) * 0.5;
    float weaveAA = max(fwidth(weaveA), fwidth(weaveB));
    float weaveMask = smoothstep(-0.25 - weaveAA * 3.0, 0.25 + weaveAA * 3.0, weave);
    vec3 weaveColor = getSchemeColor(fract(g * 0.35 + weaveMask * 0.25 + paletteShift * 0.4), l * 0.5 + 0.2, t * 0.5);
    c = mix(c, weaveColor * (0.8 + energyMix * 0.4), (0.15 + energyMix * 0.25) * weaveMask);

    float microSheen = sin(dot(uv, vec2(3.2, -2.7)) - t * (0.6 + trebleEnergy * 0.4));
    float microAA = fwidth(microSheen);
    microSheen = smoothstep(-0.18 - microAA * 2.0, 0.18 + microAA * 2.0, microSheen) - 0.5;
    c += rgb * microSheen * 0.08 * (0.5 + energyMix * 0.5);

    // Glow modulated by spectral brightness for shimmery high-frequency content
    float glowGain = clamp(iGlowIntensity, 0.05, 0.8);
    float glowFalloff = mix(7.0, 3.0, glowGain);
    float glow = exp(-l * glowFalloff) * glowGain;
    glow *= 0.35 + iOnsetPulse * 0.5 + iBrightness * 0.35 + fluxEnergy * 0.3;
    c += rgb * glow * 0.8;

    c = preserveSaturation(c, saturate(fluxEnergy + iAudioMomentum * 0.5));
    // Limit luminance and re-saturate for RGB hardware
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float clampLuma = min(luma, 0.65 + iColorContrast * 0.08);
    if (luma > 0.0) {
        c *= clampLuma / luma;
    }
    c = preserveSaturation(c, 0.5 + energyMix * 0.3);
    float vignette = smoothstep(1.35, 0.2, length(uv));
    c *= mix(0.65, 1.0, vignette);
    c = acesToneMap(c);
    c = clamp(c, 0.0, 1.0);

    fragColor = vec4(c, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
