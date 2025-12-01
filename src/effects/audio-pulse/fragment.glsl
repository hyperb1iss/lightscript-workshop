/**
 * Audio Pulse — 3D Audio Visualizer
 * Based on "3D Audio Visualizer" by @kishimisu (CC BY-NC-SA 4.0)
 * https://www.shadertoy.com/view/dtl3Dr
 * Adapted for LightScript with multiple visualization modes and color schemes
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
uniform float iDirection;
uniform float iBend;
uniform float iFlow;
uniform int iVisualStyle;
uniform int iColorScheme;

// Audio uniforms
uniform float iAudioLevel;
uniform float iAudioBass;
uniform float iAudioMid;
uniform float iAudioTreble;
uniform float iAudioDensity;
uniform float iAudioBeat;
uniform float iAudioBeatPulse;
uniform float iAudioTempo;
uniform float iAudioBassEnv;
uniform float iAudioMidEnv;
uniform float iAudioTrebleEnv;
uniform float iAudioLevelShort;
uniform float iAudioLevelLong;
uniform sampler2D iAudioSpectrum;

#define PI 3.14159265359
#define TAU 6.28318530718

// ─────────────────────────────────────────────────────────────
// Core Functions (from kishimisu)
// ─────────────────────────────────────────────────────────────

// Get frequency from spectrum texture
float getFreq(float index) {
    return texture2D(iAudioSpectrum, vec2(clamp(index, 0.0, 1.0), 0.5)).r;
}

// Logistic function for smooth amplitude scaling
float logX(float x, float a, float c) {
    return 1.0 / (exp(-a * (x - c)) + 1.0);
}

// Normalize amplitude with logistic curve (prevents harsh cutoffs)
float logisticAmp(float amp) {
    float c = 0.88, a = 20.0;
    return (logX(amp, a, c) - logX(0.0, a, c)) / (logX(1.0, a, c) - logX(0.0, a, c));
}

// Get pitch/frequency value with logistic scaling
float smoothSpectrum(float idx) {
    float sum = 0.0;
    float total = 0.0;
    for (float offset = -2.0; offset <= 2.0; offset += 1.0) {
        float weight = 1.0 - abs(offset) * 0.2;
        sum += getFreq(clamp(idx + offset * 0.005, 0.0, 1.0)) * weight;
        total += weight;
    }
    return sum / total;
}

float getPitch(float freq, float scale) {
    float baseRaw = smoothSpectrum(freq) * iSensitivity * scale;
    float base = logisticAmp(clamp(baseRaw, 0.0, 1.0));

    float smoothing = clamp(iSmoothing, 0.0, 0.95);
    if (smoothing > 0.001) {
        float offset = 0.01 + smoothing * 0.02;
        float aheadRaw = smoothSpectrum(clamp(freq + offset, 0.0, 1.0)) * iSensitivity * scale * 0.95;
        float behindRaw = smoothSpectrum(clamp(freq - offset, 0.0, 1.0)) * iSensitivity * scale * 0.95;
        float ahead = logisticAmp(clamp(aheadRaw, 0.0, 1.0));
        float behind = logisticAmp(clamp(behindRaw, 0.0, 1.0));
        float neighborhood = (base + ahead + behind) / 3.0;
        float globalLevel = clamp(iAudioLevel * (0.5 + smoothing * 0.5), 0.0, 1.0);
        float blended = mix(neighborhood, globalLevel, 0.25 + smoothing * 0.35);
        base = mix(base, blended, smoothing * 0.7);
    }

    return base;
}

// Get volume/energy level
float getVol(float samples) {
    float vol = 0.0;
    for (float i = 0.0; i < 8.0; i++) {
        vol += smoothSpectrum(i / samples);
    }
    return vol / 8.0 * iSensitivity;
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((vec2(p3.x, p3.y) + p3.z) * vec2(5.0, 5.5));
}

float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

float hash12(vec2 p) {
    vec2 h = hash22(p);
    return fract(h.x + h.y);
}

// Signed distance function for box
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Light attenuation
float light(float d, float att) {
    return 1.0 / (1.0 + pow(max(abs(d * att), 0.0001), 1.3));
}

mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// ─────────────────────────────────────────────────────────────
vec3 boostSaturation(vec3 color, float boost) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 delta = color - vec3(luma);
    return clamp(vec3(luma) + delta * (1.0 + boost), 0.0, 1.15);
}

float getGlowGain() {
    float normalized = clamp(iGlowIntensity, 0.0, 1.0);
    float eased = pow(normalized, 0.85);
    return mix(0.05, 1.35, eased);
}

vec3 limitVibrancy(vec3 color) {
    float maxChannel = max(max(color.r, color.g), color.b);
    float minChannel = min(min(color.r, color.g), color.b);
    float saturation = maxChannel - minChannel + 1e-4;

    if (maxChannel > 0.85) {
        float target = mix(0.82, 0.93, smoothstep(0.85, 1.0, maxChannel));
        color *= target / maxChannel;
    }

    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float satBoost = smoothstep(0.0, 0.6, saturation);
    color = mix(vec3(luma), color, 0.6 + satBoost * 0.35);

    float saturationGuard = smoothstep(0.12, 0.0, minChannel);
    color = mix(color, color * vec3(0.96, 0.96, 0.96), saturationGuard * 0.12);
    return clamp(color, 0.0, 1.0);
}

// Color Schemes
// 0: Cyberpunk, 1: Lava, 2: Aurora, 3: Vaporwave, 4: Toxic, 5: Prism
// ─────────────────────────────────────────────────────────────

vec3 getSchemeColor(vec3 id, float t) {
    vec3 a;
    vec3 b;

    if (iColorScheme == 0) {
        a = vec3(0.98, 0.05, 0.78);
        b = vec3(0.05, 0.75, 1.2);
    } else if (iColorScheme == 1) {
        a = vec3(1.2, 0.25, 0.05);
        b = vec3(0.9, 0.55, 0.05);
    } else if (iColorScheme == 2) {
        a = vec3(0.1, 0.8, 0.7);
        b = vec3(0.2, 0.4, 1.2);
    } else if (iColorScheme == 3) {
        a = vec3(1.1, 0.45, 0.8);
        b = vec3(0.35, 0.9, 1.2);
    } else if (iColorScheme == 4) {
        a = vec3(0.35, 1.15, 0.2);
        b = vec3(0.05, 0.65, 0.95);
    } else {
        vec3 rainbow = 0.6 + 0.6 * cos(id * 0.8 + vec3(0.0, 2.0, 4.0) + t);
        return boostSaturation(rainbow, 0.9);
    }

    float wave = 0.5 + 0.5 * sin(t + dot(id, vec3(0.7, 0.3, 0.55)));
    vec3 color = mix(a, b, wave);
    color += 0.15 * sin(vec3(0.0, 2.0, 4.0) + t * 0.8 + id.yzx * 0.6);
    return boostSaturation(color, 0.8);
}

// ─────────────────────────────────────────────────────────────
// Style 0: Pulse Field lattice (sparkling cube bloom)
// ─────────────────────────────────────────────────────────────

vec3 pulseFieldStyle(vec2 uv, float time) {
    vec3 col = vec3(0.0);
    float vol = clamp(getVol(8.0) * 1.1, 0.0, 1.3);
    float bassPulse = clamp(iAudioBass * iBassBoost * 0.2, 0.0, 1.5);
    float midPulse = iAudioMid;
    float treblePulse = iAudioTreble;
    float glowGain = getGlowGain();
    float baseFlow = clamp(iFlow, -1.0, 1.0);
    float beatOffset = iAudioBeatPulse * (baseFlow >= 0.0 ? 1.0 : -1.0);
    float flow = clamp(baseFlow + beatOffset, -1.5, 1.5);
    float flowAbs = abs(flow);
    float dir = iDirection * PI;
    float bend = clamp(iBend, -2.0, 2.0);
    float travelSign = flow >= 0.0 ? 1.0 : -1.0;

    float axialShift = time * flow * 1.6;

    vec3 ro = vec3(
        sin(time * 0.25 + dir) * 1.2,
        cos(time * 0.21 + dir * 0.8) * 1.0,
        axialShift
    );
    ro.xy += vec2(sin(time * 0.3 + bend * 0.2), cos(time * 0.27 - bend * 0.1)) * 0.4;
    ro += vec3(0.0, 0.0, travelSign * (0.5 + bassPulse * 0.8));

    float zoom = 1.0 + bassPulse * 0.4 + vol * 0.2 + iAudioBeatPulse * 0.8;
    vec3 rd = normalize(vec3(uv * (0.9 + bassPulse * 0.1), zoom));
    rd.xy = rotate2d(time * 0.06 + vol * 0.08 + dir) * rd.xy;
    rd.y += sin(time * 0.15 + uv.x * 2.0) * 0.04;
    rd.x += sin(time * 0.12 + uv.y * 1.8) * 0.035;
    rd.z += bend * 0.03 + flow * 0.04;

    float travel = 0.0;
    float glowMix = mix(0.02, 0.7, glowGain);

    for (int i = 0; i < 70; i++) {
        vec3 p = ro + rd * travel * travelSign;
        vec3 scenePos = p;
        float swirlPhase = time * 0.18 + dot(scenePos, vec3(0.05, 0.07, 0.09));
        vec3 flowField = vec3(
            sin(swirlPhase),
            cos(swirlPhase),
            sin(swirlPhase * 0.7)
        ) * (0.1 + flowAbs * 0.22);
        scenePos += flowField;
        scenePos.xy += flow * vec2(scenePos.y, -scenePos.x) * 0.12;
        scenePos.xy += bend * vec2(scenePos.y, -scenePos.x) * 0.02;
        scenePos.z += bassPulse * 0.2;

        vec3 cell = floor(scenePos);
        vec3 local = fract(scenePos) - 0.5;

        float freqIdx = fract((cell.x * 0.31 + cell.y * 0.21 + cell.z * 0.13) * 0.25 + bassPulse * 0.015);
        float pitched = getPitch(freqIdx, 0.9 + vol * 0.3);
        float bandMorph = smoothstep(0.0, 1.0, fract(dot(cell, vec3(0.17, 0.11, 0.07))));
        float bandEnergy = mix(bassPulse, treblePulse, bandMorph);
        float smoothEnergy = mix(midPulse, bandEnergy, 0.6);
        float blended = mix(pitched, smoothEnergy, 0.6);
        float amp = mix(blended, 0.18 + vol * 0.4, 0.4);
        amp = smoothstep(0.0, 1.0, amp);

        float sizeBase = 0.2 + amp * 0.15 + midPulse * 0.05;
        float cube = sdBox(local, vec3(sizeBase));
        float glowDist = max(cube, 0.0);
        float sparkle = exp(-glowDist * (14.0 + treblePulse * 8.0)) / (0.45 + glowDist * 32.0);
        float swirl = sin(dot(cell, vec3(0.32, 0.52, 0.71)) + time * 0.35 + freqIdx * 2.6);
        float flicker = 0.8 + 0.2 * swirl;

        vec3 schemeCol = getSchemeColor(cell + vec3(0.0, 0.0, axialShift * 0.2), time * iColorSpeed * 0.3 + freqIdx * 2.0);
        float energy = (0.04 + amp * 0.35 + vol * 0.08) * glowMix;
        col += schemeCol * sparkle * flicker * energy;

        float warpTrail = exp(-abs(local.z) * (7.5 - amp * 3.0));
        col += schemeCol * warpTrail * 0.006 * (0.25 + amp * 0.4) * glowMix;

        float stepLen = max(abs(cube), 0.035 + amp * 0.02);
        travel += stepLen;
        if (travel > 34.0) break;
    }

    float fog = vol * 0.015 * glowMix;
    vec3 fogCol = getSchemeColor(vec3(2.5, 0.5, 1.0), time * 0.15 + bassPulse * 0.2);
    float centerBias = smoothstep(0.95, 0.15, length(uv + vec2(bend * 0.08, 0.0)));
    col += fogCol * fog * centerBias;

    col = col / (1.0 + col * 0.75);
    col = clamp(col, 0.0, 1.0);

    return col;
}

// ─────────────────────────────────────────────────────────────
// Style 1: Grid - Infinite flying grid of reactive cubes
// ─────────────────────────────────────────────────────────────

vec3 gridStyle(vec2 uv, float time) {
    vec3 col = vec3(0.0);
    float vol = getVol(8.0);
    float glowGain = getGlowGain();
    float beatDrive = 1.0 + iAudioBeatPulse * 0.6;
    float tempoPhase = (iAudioTempo / 180.0) * time;

    // Ray direction (constant for this pixel)
    vec3 rd = normalize(vec3(uv * (0.85 + iAudioBeat * 0.15), 1.0));
    rd.xy = rotate2d(time * 0.1 + iAudioDensity * 0.3 + tempoPhase * 0.2) * rd.xy;

    // Camera flies forward through the grid
    vec3 ro = vec3(0.0, 0.0, time * 2.5 * beatDrive);
    ro.xy += vec2(sin(time * 0.25 + tempoPhase), cos(time * 0.18 - tempoPhase)) * (0.2 + vol * 0.25 + iAudioBeat * 0.2);

    for (float i = 0.0, t = 0.0; i < 50.0; i++) {
        // Current position along ray
        vec3 p = ro + t * rd;

        // Grid cell ID and local position
        vec3 id = floor(p);
        vec3 q = fract(p) - 0.5;

        // Each cube reacts to its own frequency band based on position
        float freqIdx = mod(abs(id.x) + abs(id.y) * 2.0 + abs(id.z) * 0.5, 16.0) / 16.0;
        float env = mix(iAudioBassEnv, iAudioMidEnv, freqIdx);
        float amp = mix(getPitch(freqIdx, 1.0 + vol * 0.25), env, 0.6);

        // Box size pulses with amplitude
        float boxSize = 0.25 + amp * 0.15;
        float d = sdBox(q, vec3(boxSize));

        // Distance fade
        float fade = smoothstep(28.0, 5.0, t) * (0.85 + iAudioBeat * 0.15);

        // Color varies with cell position
        vec3 schemeCol = getSchemeColor(id + vec3(0.0, 0.0, tempoPhase), time * iColorSpeed * 0.3);

        // Accumulate glow - sharper falloff to avoid over-blur
        float crisp = pow(max(0.0, 1.0 - max(d, 0.0) * (9.0 + amp * 5.0)), 2.3);
        float spark = exp(-max(d, 0.0) * (20.0 + amp * 25.0));
        float glow = (crisp + spark * 0.6) * (0.35 + amp * 0.7);
        col += schemeCol * glow * fade * (0.5 + vol * 0.5) * glowGain * 0.6;

        // Step forward (minimum step prevents infinite loops)
        t += max(d, 0.04 + 0.03 * amp) / beatDrive;
        if (t > 35.0) break;
    }

    return col;
}

// ─────────────────────────────────────────────────────────────
// Style 2: Waveform - 3D frequency ribbons
// ─────────────────────────────────────────────────────────────

vec3 waveformStyle(vec2 uv, float time) {
    vec3 col = vec3(0.0);
    float glowGain = getGlowGain();
    float bassPulse = clamp(iAudioBass * iBassBoost * 0.25, 0.0, 2.0);

    vec2 warpedUV = uv;
    warpedUV.x += sin(time * 0.12) * 0.08;
    warpedUV.y += cos(time * 0.1) * 0.03;

    for (float layer = 0.0; layer < 3.0; layer++) {
        float depth = 1.0 - layer * 0.35;
        float layerTime = time * (0.8 + layer * 0.25);
        float freqSpread = 3.5 + bassPulse * 0.6 + layer * 0.4;
        float crest = sin((warpedUV.x + layer * 0.15) * freqSpread + layerTime);
        float freqIdx = fract((crest + 1.0) * 0.25 + layer * 0.1);
        float amp = getPitch(freqIdx, 1.2 + layer * 0.4);

        float height = 0.35 + layer * 0.12;
        float y = crest * height * (0.8 + amp) - layer * 0.25;

        vec3 schemeCol = getSchemeColor(vec3(layer * 2.5, freqIdx * 10.0, time * 0.1), time * iColorSpeed * 0.5 + layer * 0.3);

        float line = exp(-abs(warpedUV.y - y) * mix(220.0, 320.0, depth)) * (0.4 + amp * 0.9);
        float core = exp(-abs(warpedUV.y - y) * mix(420.0, 520.0, depth)) * (0.2 + amp * 0.8);
        float halo = exp(-abs(warpedUV.y - y) * 40.0) * 0.08;

        float dotPhase = fract((warpedUV.x + layer * 0.2) * 5.0 + time * 0.4);
        float dotMask = smoothstep(0.1, 0.0, abs(dotPhase - 0.5));
        float dot = exp(-abs(warpedUV.y - y) * 260.0) * dotMask * (0.3 + amp * 0.7);

        col += schemeCol * (line + core + dot) * depth * glowGain;
        col += schemeCol * halo * depth * 0.4;
    }

    vec3 bgLow = getSchemeColor(vec3(-2.0, 0.0, 0.0), time * 0.1);
    vec3 bgHigh = getSchemeColor(vec3(4.0, 1.5, 0.0), time * -0.05);
    float gradient = smoothstep(-0.9, 0.8, uv.y + 0.1);
    vec3 bg = mix(bgLow, bgHigh, gradient) * 0.08;
    col += bg;

    float sparkle = hash12(uv * 120.0 + vec2(time * 0.15, -time * 0.2)) * 0.01;
    col += sparkle;

    return col;
}

// ─────────────────────────────────────────────────────────────
// Style 3: Vortex - Spiral tunnel with frequency bands
// ─────────────────────────────────────────────────────────────

vec3 vortexStyle(vec2 uv, float time) {
    vec3 col = vec3(0.0);
    float vol = clamp(getVol(8.0) * 1.1, 0.0, 1.6);
    float bassPulse = clamp(iAudioBass * iBassBoost * 0.18, 0.0, 1.8);
    float treble = iAudioTreble;
    float glowGain = getGlowGain();

    vec2 swirlUV = rotate2d(time * 0.1 + bassPulse * 0.05) * uv;
    float r = length(swirlUV);
    float a = atan(swirlUV.y, swirlUV.x);
    float spiral = a / TAU + r * 3.4 - time * (0.4 + bassPulse * 0.1);

    int rings = iRingCount;
    float spacing = mix(0.1, 0.18, clamp(float(rings) / 12.0, 0.0, 1.0));
    for (int i = 0; i < 16; i++) {
        if (i >= rings) break;

        float fi = float(i);
        float freqIdx = fi / max(float(rings - 1), 1.0);
        float amp = max(0.05, getPitch(freqIdx, 1.1 + treble * 0.5));

        float ringR = 0.12 + fi * spacing;
        ringR += amp * (0.1 + 0.15 * (1.0 - freqIdx)) + vol * 0.05 + bassPulse * 0.06;
        float spiralPhase = fract(spiral + fi * 0.15);
        float spiralAmp = sin(spiralPhase * TAU) * (0.05 + amp * 0.06);

        float d = abs(r - ringR - spiralAmp);
        float glow = exp(-d * d * (120.0 + amp * 60.0)) * (0.4 + amp * 1.0);
        glow *= smoothstep(1.45, 0.25, r + amp * 0.2);
        glow *= 0.9 + bassPulse * 0.3;

        float segments = max(float(rings) * 1.5, 5.0);
        float segmentPhase = fract(a / TAU * segments + time * 0.45 + fi * 0.18);
        float segmentAmp = getPitch(segmentPhase, 0.9);
        glow *= 0.5 + segmentAmp;

        vec3 schemeCol = getSchemeColor(vec3(fi * 1.3, ringR * 6.0, 0.0), time * iColorSpeed * 0.4 + freqIdx);
        col += schemeCol * glow * glowGain;
    }

    float arms = 6.0;
    float armPattern = sin(a * arms - time * (1.2 + treble)) * 0.5 + 0.5;
    float armGlow = exp(-abs(armPattern - r * 0.8) * 6.0) * exp(-r * 1.2);
    col += getSchemeColor(vec3(arms, 0.5, 0.0), time * 0.5) * armGlow * (0.3 + treble * 0.6);

    float centerGlow = exp(-r * 2.6) * (0.5 + vol * 0.5 + bassPulse * 0.4) * glowGain;
    col += getSchemeColor(vec3(0.0, 3.0, 0.0), time * 1.1) * centerGlow;

    col *= smoothstep(1.4, 0.3, r);

    return col;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    // Centered UV coordinates (-1 to 1 range, aspect corrected)
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float t = iTime;

    vec3 color = vec3(0.0);

    // Select visualization style
    if (iVisualStyle == 0) {
        color = pulseFieldStyle(uv, t);
    } else if (iVisualStyle == 1) {
        color = gridStyle(uv, t);
    } else if (iVisualStyle == 2) {
        color = waveformStyle(uv, t);
    } else {
        color = vortexStyle(uv, t);
    }

    // Global audio modulation
    float vol = getVol(8.0);
    color *= 0.8 + vol * 0.4;

    // Keep saturation without extra bloom/blur
    color = boostSaturation(color, 0.2);

    // Tone mapping (soft)
    color = color / (1.0 + color * 0.5);
    color = limitVibrancy(color);

    // No vignette/grain — keep edges consistent

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
