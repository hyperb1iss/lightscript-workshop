// Black Hole Spaghettification — relativistic lensing, accretion disk, starfield
// Lightweight approximation designed for RGB drama and performance

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

// Controls
uniform float iMass;          // 0..2   (gravitational strength)
uniform float iSpin;          // 0..1   (frame dragging swirl)
uniform float iDiskIntensity; // 0..2   (brightness of accretion disk)
uniform float iDiskThickness; // 0..1   (radial thickness of disk)
uniform float iLensing;       // 0..2   (warp amount)
uniform float iStarDensity;   // 0..2   (background star density)
uniform float iRelativity;    // 0..1   (relativistic effects strength)
uniform float iSaturation;    // 0..2
uniform float iBrightness;    // 0..2
uniform int   iPalette;       // palette selector
uniform float iHighlight;     // 0..1   (highlight roll-off)

// Hash / noise helpers
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
  return c.z*mix(K.xxx, clamp(p-K.xxx, 0.0, 1.0), c.y);
}

// Flexible palette selector
vec3 palette(float t, int mode){
  t = fract(t);
  if(mode==0){ // Aurora
    return mix(vec3(0.05,0.9,0.2), vec3(0.2,0.2,1.0), 0.5+0.5*sin(t*6.28));
  } else if(mode==1){ // Rainbow
    return hsv2rgb(vec3(t, 0.95, 1.0));
  } else if(mode==2){ // Neon
    return 0.5 + 0.5*cos(6.28318*(t + vec3(0.00,0.33,0.67)));
  } else if(mode==3){ // Ocean
    return mix(vec3(0.0,0.2,0.5), vec3(0.0,0.9,1.0), t);
  } else if(mode==4){ // Fire
    return mix(vec3(0.2,0.0,0.0), vec3(1.0,0.6,0.0), smoothstep(0.0,1.0,t));
  } else if(mode==5){ // Cyberpunk
    return mix(vec3(1.0,0.0,0.8), vec3(0.0,1.0,1.0), t);
  } else if(mode==6){ // Sunset
    return mix(vec3(0.9,0.2,0.0), vec3(1.0,0.8,0.2), t);
  } else if(mode==7){ // Candy
    return mix(vec3(1.0,0.0,0.6), vec3(0.2,1.0,0.8), t);
  } else if(mode==8){ // Pastel
    return mix(vec3(0.9,0.8,1.0), vec3(0.8,1.0,0.9), t);
  } else if(mode==9){ // Forest
    return mix(vec3(0.0,0.2,0.0), vec3(0.2,0.9,0.3), t);
  } else if(mode==10){ // Heatmap
    return hsv2rgb(vec3(0.05 + 0.95*t, 1.0, 1.0));
  } else if(mode==11){ // Viridis-ish
    return mix(vec3(0.267,0.004,0.329), vec3(0.993,0.906,0.144), t);
  } else if(mode==12){ // Inferno-ish
    return mix(vec3(0.001,0.000,0.014), vec3(0.988,0.998,0.644), t);
  } else if(mode==13){ // Plasma-ish
    return mix(vec3(0.050,0.030,0.527), vec3(0.940,0.975,0.131), t);
  } else if(mode==14){ // Magma-ish
    return mix(vec3(0.001,0.000,0.016), vec3(0.987,0.730,0.258), t);
  } else if(mode==15){ // Mono
    return vec3(t);
  }
  return hsv2rgb(vec3(t, 0.9, 1.0));
}

// Soft highlight roll-off to avoid harsh whites
vec3 softClip(vec3 c, float k){
  // Larger k => stronger roll-off
  float kk = max(0.0, k);
  return c / (1.0 + kk * c);
}

// Background starfield
vec3 stars(vec2 uv, float density){
  vec2 g = floor(uv*vec2(140.0, 90.0));
  float s = step(1.0 - clamp(density,0.0,2.0)*0.45, hash21(g));
  // Twinkle with soft envelope
  float tw = 0.6 + 0.4*sin(0.7*iTime + hash21(g+7.1)*6.283);
  return vec3(s*tw*0.7); // slightly dimmer stars to reduce white spikes
}

// Accretion disk color around a ring with Doppler boosting
vec3 diskColor(float ang, float r, float rel, float spin){
  // Palette-driven color along disk
  float t = 0.55 + 0.45*sin(ang*2.0 - iTime*0.7);
  vec3 base = palette(t, iPalette);

  // Doppler boosting: brighter on approaching side
  float approach = 0.5 + 0.5*cos(ang - spin*2.0*iTime);
  float boost = mix(1.0, 1.8, rel) * (0.6 + 0.8*approach);
  return base * boost * (1.0/(1.0 + 0.4*r));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;

  // Parameters
  float mass = clamp(iMass, 0.0, 2.0);
  float spin = clamp(iSpin, 0.0, 1.0);
  float lens = clamp(iLensing, 0.0, 2.0);
  float rel = clamp(iRelativity, 0.0, 1.0);
  float diskI = clamp(iDiskIntensity, 0.0, 2.0);
  float diskT = clamp(iDiskThickness, 0.0, 1.0);
  float sat = clamp(iSaturation, 0.0, 2.0);
  float brt = clamp(iBrightness, 0.0, 2.0);
  float starD = clamp(iStarDensity, 0.0, 2.0);

  // Gravitational lensing approximation (radial warp)
  float r = length(uv);
  vec2 dir = uv / max(r, 1e-5);
  float rs = 0.18 * mass; // pseudo Schwarzschild radius in NDC
  float deflect = lens * rs / (r + rs);
  vec2 warped = uv + dir * deflect * (0.35 + 0.65*rel);

  // Background stars with slight shear around hole
  vec2 starUv = warped * 1.2 + 0.08*vec2(sin(uv.y*2.0), cos(uv.x*2.0))*mass;
  vec3 bg = stars(starUv, starD);

  // Accretion disk: ring around radius R0
  float R0 = 0.42;
  float thickness = mix(0.04, 0.16, diskT);
  float ring = 1.0 - smoothstep(R0 - thickness, R0, r) + (1.0 - smoothstep(R0, R0 + thickness, r));
  ring = clamp(ring, 0.0, 1.0);

  float ang = atan(uv.y, uv.x);
  vec3 disk = diskColor(ang, r, rel, spin) * ring * diskI;

  // Photon ring highlight near ~1.5*rs
  float photonR = 0.25 + 0.25*mass;
  float rim = smoothstep(photonR, photonR-0.01, abs(r - photonR));
  vec3 photon = vec3(1.1, 0.95, 0.75) * rim * 0.18 * (0.6 + 0.4*rel);

  // Event horizon (singularity)
  float horizon = smoothstep(rs*1.2, rs*0.95, r);
  vec3 hole = mix(vec3(0.0), vec3(0.0), horizon); // keep black

  // Compose
  vec3 col = bg * 0.7;
  col = mix(col, col + disk, ring);
  col += photon;
  col = mix(col, vec3(0.0), 1.0 - horizon);

  // Spaghettification: radial stretch near horizon
  float stretch = smoothstep(rs*2.0, rs*1.0, r) * 0.7 * (0.3 + 0.7*rel);
  col.rg += dir * stretch * 0.06;

  // Color grading
  float lum = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(lum), col, sat);
  col *= brt;

  // Apply highlight roll-off
  col = softClip(col, iHighlight);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

void main(){
  mainImage(gl_FragColor, gl_FragCoord.xy);
}


