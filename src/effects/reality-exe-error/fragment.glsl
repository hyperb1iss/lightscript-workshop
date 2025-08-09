// Reality.exe — Safer, coherent glitch aesthetic
// Modes: Mixed, Dialog, BSOD, Loading, Glitch
// Design goals: low frequency motion, no hard flashes, parameterized intensity

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

// Controls
uniform int   iMode;         // 0 Mixed, 1 Dialog, 2 BSOD, 3 Loading, 4 Glitch
uniform float iSeverity;     // 0..1
uniform float iGlitch;       // 0..1
uniform float iSaturation;   // 0..2
uniform float iBrightness;   // 0..2
uniform float iFlashLimit;   // 0..1 (caps flicker amplitude)
uniform float iSafety;       // 0..1 (extra damping)
uniform float iMotion;       // 0..2 (envelope speed/amount)
uniform float iParallax;     // 0..1 (camera parallax amount)
uniform float iCurvature;    // 0..1 (CRT curvature/vignette)
uniform float iArtifact;     // 0..1 (text/block density)
uniform float iMixSpeed;     // 0..2 (mode mix speed)

// Small helpers
float hash21(vec2 p){
  p = fract(p*vec2(233.34,851.73));
  p += dot(p, p+23.45);
  return fract(p.x*p.y);
}

float vnoise(vec2 x){
  vec2 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  float a=hash21(i);
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

vec3 hsv2rgb(vec3 c){
  vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);
  vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);
  return c.z*mix(K.xxx, clamp(p-K.xxx,0.0,1.0), c.y);
}

// Barrel distortion / curvature
vec2 applyCurvature(vec2 uv, float k){
  float r2 = dot(uv, uv);
  return uv + uv * r2 * k;
}

// Vignette for edges
float vignette(vec2 uv){
  float r = length(uv);
  return smoothstep(1.1, 0.65, r);
}

// Soft rectangle with border
float rect(vec2 uv, vec2 center, vec2 size, float r){
  vec2 q = abs(uv-center)-size;
  vec2 q2 = max(q,0.0);
  return 1.0 - smoothstep(r-0.01, r+0.01, length(q2));
}

// Dialog composition (title bar, icon, ok button)
vec3 dialog(vec2 uv, float t, float severity){
  vec3 col = vec3(0.0);
  vec2 center = vec2(0.0);
  vec2 size = vec2(0.55, 0.35);
  float shake = 0.01 * severity * sin(t*2.2);
  vec2 pos = center + vec2(shake, -shake);
  float body = rect(uv, pos, size, 0.04);
  float border = rect(uv, pos, size+vec2(0.02), 0.04) - body;
  float title = rect(uv, pos+vec2(0.0, size.y*0.28), vec2(size.x*0.98, size.y*0.12), 0.03);
  vec2 iconPos = pos + vec2(-size.x*0.33, -0.02);
  float icon = smoothstep(0.05, 0.03, length(uv-iconPos));
  vec2 okPos = pos + vec2(size.x*0.22, -size.y*0.28);
  vec2 okSize = vec2(0.12,0.06);
  float ok = rect(uv, okPos, okSize, 0.02);
  col += vec3(0.08,0.10,0.13) * (border*0.9);
  col += vec3(0.95) * (body*0.6);
  col += vec3(0.10,0.35,0.85) * (title*0.9);
  col += vec3(1.0,0.8,0.2) * (icon*0.8);
  col += vec3(0.9) * ok * 0.8;
  return col;
}

// BSOD (static) with mild scanlines
vec3 bsod(vec2 uv, float t, float severity){
  vec3 blue = vec3(0.0, 0.08, 0.6);
  float scan = 0.9 + 0.1*sin(uv.y*220.0 + t*2.5);
  vec3 col = blue * scan;
  // sparse white text blocks
  float density = mix(0.8, 0.94, clamp(iArtifact, 0.0, 1.0));
  float txt = step(density, hash21(floor(uv*vec2(80.0,25.0))));
  col += vec3(1.0) * txt * 0.25 * (0.6 + 0.4*severity);
  return col;
}

// Loading bar (slow, slightly corrupted)
float loading(vec2 uv, float t, float corruption){
  vec2 pos = vec2(0.0, -0.28);
  vec2 size= vec2(0.7, 0.08);
  float inBar = rect(uv, pos, size, 0.02);
  float progress = fract(t*0.08);
  float wobble = 0.02 * corruption * (vnoise(uv*40.0 + t*1.2) - 0.5);
  float filled = step(uv.x, pos.x - size.x + size.x*2.0*progress + wobble);
  return inBar * filled;
}

// Gentle glitch — noise + slight channel emphasis, time-limited
vec3 glitch(vec3 color, vec2 uv, float t, float amount){
  if (amount < 0.01) return color;
  float n = (vnoise(uv*160.0 + t*3.0)-0.5);
  color += n * amount * 0.12;
  color.r += amount * 0.04;
  color.b -= amount * 0.03;
  // low-amplitude scanline modulation
  float scan = 0.95 + 0.05*sin(uv.y*400.0 + t*1.8);
  return color * scan;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
  float t = iTime;

  // Curvature and subtle camera/parallax
  float curv = clamp(iCurvature, 0.0, 1.0) * 0.25; // keep modest
  uv = applyCurvature(uv, curv);
  vec2 cam = 0.04 * iParallax * vec2(sin(t*0.31*(1.0+iMotion)), cos(t*0.27*(1.0+iMotion)));
  vec2 uvs = uv + cam;

  // Safety damping for any fast oscillation
  float safety = clamp(iSafety, 0.0, 1.0);
  float sev = clamp(iSeverity, 0.0, 1.0) * mix(1.0, 0.7, safety);
  float glt = clamp(iGlitch, 0.0, 1.0) * mix(1.0, 0.7, safety);

  // base background
  vec3 color = vec3(0.02, 0.02, 0.03);

  // Mixed mode blends elements slowly at < 1Hz envelopes
  if (iMode == 0){
    float ms = 0.3 + 1.2 * clamp(iMixSpeed, 0.0, 2.0);
    float e1 = 0.5 + 0.5*sin(t*0.6*ms);
    float e2 = 0.5 + 0.5*sin(t*0.4*ms + 1.7);
    float e3 = 0.5 + 0.5*sin(t*0.3*ms + 3.1);
    vec3 d = dialog(uvs, t, sev) * e1;
    vec3 b = bsod(uvs, t, sev) * e2 * 0.9;
    float l = loading(uvs, t, sev) * e3;
    color = mix(color, b, 0.45);
    color += d * 0.9;
    color += vec3(0.2, 0.85, 0.25) * l * 0.8;
  } else if (iMode == 1){
    color = mix(color, dialog(uvs, t, sev), 1.0);
  } else if (iMode == 2){
    color = mix(color, bsod(uvs, t, sev), 1.0);
  } else if (iMode == 3){
    float l = loading(uvs, t, sev);
    color += vec3(0.2, 0.85, 0.25) * l;
  } else {
    // Glitch-only uses a faint dialog as substrate
    color = mix(color, dialog(uvs, t, sev)*0.6, 1.0);
  }

  // Limit flashiness: cap any rapid amplitude with iFlashLimit (0..1)
  float cap = clamp(iFlashLimit, 0.0, 1.0);
  color = mix(color, clamp(color, 0.0, 1.0), 1.0 - 0.5*cap);

  // Apply gentle glitch
  color = glitch(color, uvs, t, glt);

  // Saturation/Brightness controls
  float sat = clamp(iSaturation, 0.0, 2.0);
  float brt = clamp(iBrightness, 0.0, 2.0);
  float lum = dot(color, vec3(0.299,0.587,0.114));
  color = mix(vec3(lum), color, clamp(sat, 0.0, 2.0));
  color *= brt;

  // Subtle chromatic aberration by radial distance
  float r = length(uv);
  float ab = glt * 0.04 + 0.06 * clamp(iCurvature,0.0,1.0);
  color.r += r * ab * 0.5;
  color.b -= r * ab * 0.4;

  // Vignette to anchor composition
  color *= vignette(uv);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}

void main(){
  mainImage(gl_FragColor, gl_FragCoord.xy);
}


