/**
 * Cellular Automaton RGB - WebGL Effect
 * Conway's Game of Life and other cellular automata with RGB color evolution
 * Watch digital life emerge and evolve in stunning patterns across your keyboard ✨
 */

import * as THREE from 'three'
import { initializeEffect } from '../core'
import { BooleanControl, ComboboxControl, Effect, NumberControl } from '../core/controls/decorators'
import { boolToInt, comboboxValueToIndex, normalizePercentage } from '../core/controls/helpers'
import { WebGLEffect } from '../core/effects/webgl-effect'
import { createStandardUniforms, initializeWebGL, WebGLContext } from '../core/utils/webgl'

export interface CellularAutomatonControls {
    automatonRule: number // 0-5: Conway, Rule30, Rule110, Brian's Brain, Langton's Ant, Custom
    evolutionSpeed: number // 0-2: Speed of generation updates
    initialPattern: number // 0-4: Random, Glider, Oscillators, Puffer, Custom
    colorMappingMode: number // 0-3: Age-based, Population, Velocity, Multi-layer
    cellSize: number // 0-2: Size of each cell
    wrapAround: boolean // Toroidal topology
    birthRule: number // 0-8: Custom birth rule
    survivalRule: number // 0-8: Custom survival rule
    trailEffect: number // 0-2: Cell history visualization
    generationCounter: boolean // Show generation number
    rgbChannelMode: number // 0-2: Independent, Cross-interact, Unified
    multiLayerDepth: number // 1-8: Number of automaton layers
    visualStyle: number // 0-4 curated visual styles
    psychedelia: number // 0..1 intensity for camera/aberration
    entropy: number // 0..1 chaos injection probability
}

// Simulation shader: updates automaton state in a low-res grid render target.
// State encoding: R = alive (0..1), G = age (0..1), B = aux (Brian phase: 0=off, 0.5=dying, 1=on)
const simFragmentShader = `
precision mediump float;

uniform sampler2D uPrevState;
uniform vec2 uGridSize;     // grid resolution (state RT size)
uniform float iAutomatonRule; // 0:Conway, 3:Brian, 5:Custom
uniform float iBirthRule;     // 0..255 bitmask
uniform float iSurvivalRule;  // 0..255 bitmask
uniform float iTrailEffect;   // 0..2 controls age decay
uniform float iWrapAround;    // bool as float
uniform float iEntropy;       // 0..1 chaos injection probability

// Fetch a cell (with optional wrapping)
vec4 fetchCell(ivec2 c) {
  vec2 gs = uGridSize;
  // Clamp or wrap
  if (iWrapAround < 0.5) {
    c = ivec2(clamp(vec2(c), vec2(0.0), gs - 1.0));
    } else {
    c = ivec2(mod(vec2(c) + gs, gs));
  }
  vec2 uv = (vec2(c) + 0.5) / gs;
  return texture2D(uPrevState, uv);
}

int countNeighbors(ivec2 p) {
  int n = 0;
  for (int dy=-1; dy<=1; dy++) {
    for (int dx=-1; dx<=1; dx++) {
      if (dx==0 && dy==0) continue;
      vec4 s = fetchCell(p + ivec2(dx,dy));
      n += int(s.r > 0.5);
    }
  }
  return n;
}

float getBit(float mask, int bit) {
  float v = floor(mask / pow(2.0, float(bit)));
  return mod(v, 2.0);
}

void main() {
  ivec2 cell = ivec2(floor(gl_FragCoord.xy));
  vec4 prev = fetchCell(cell);

  float alive = step(0.5, prev.r);
  float nextAlive = 0.0;
  float brianPhase = prev.b; // 0 off, 0.5 dying, 1 on

  int neigh = countNeighbors(cell);

  if (int(iAutomatonRule) == 3) {
    // Brian's Brain: Off -> On if exactly 2 neighbors On, On -> Dying, Dying -> Off
    float isOn = step(0.9, brianPhase);
    float isDying = step(0.4, brianPhase) * (1.0 - step(0.9, brianPhase));
    float willTurnOn = float(neigh == 2);
    if (isOn > 0.5) {
      nextAlive = 0.0; // becomes dying
      brianPhase = 0.5;
    } else if (isDying > 0.5) {
      nextAlive = 0.0; // becomes off
      brianPhase = 0.0;
    } else {
      nextAlive = willTurnOn;
      brianPhase = willTurnOn;
    }
  } else if (int(iAutomatonRule) == 5) {
    // Custom outer-totalistic via bitmasks
    float survive = getBit(iSurvivalRule, neigh);
    float birth = getBit(iBirthRule, neigh);
    nextAlive = mix(birth, survive, alive);
    brianPhase = 0.0;
  } else {
    // Conway's Game of Life (default)
    float survive = float(neigh == 2 || neigh == 3);
    float birth = float(neigh == 3);
    nextAlive = mix(birth, survive, alive);
    brianPhase = 0.0;
  }

  // Age/trail update: increase when alive, decay when dead
  float decay = mix(0.96, 0.80, clamp(iTrailEffect, 0.0, 2.0) * 0.5);
  float age = prev.g;
  age = mix(age * decay, min(1.0, age + 0.15), nextAlive);

  // Entropy: random births to prevent stagnation (uniform across grid)
  float rnd = fract(sin(dot((vec2(cell) + vec2(37.0, 17.0)), vec2(12.9898,78.233))) * 43758.5453 + iAutomatonRule);
  if (rnd < iEntropy * 0.02) {
    nextAlive = 1.0;
    age = max(age, 0.3);
  }

  gl_FragColor = vec4(nextAlive, age, brianPhase, 1.0);
}
`

// Display shader: maps state to color with artistic palettes and effects
const displayFragmentShader = `
precision mediump float;

uniform sampler2D uState;
uniform vec2 iResolution;    // canvas resolution
uniform vec2 uGridSize;      // grid resolution of state
uniform float iTime;
uniform float iColorMappingMode; // 0..3
uniform float iCellSize;
uniform float iTrailEffect;
uniform float iRgbChannelMode;
uniform float iMultiLayerDepth;
uniform float iGenerationCounter;
uniform float iVisualStyle;      // 0..4
uniform float iPsychedelia;      // 0..1

// IQ-style palette generator
vec3 palette(vec3 a, vec3 b, vec3 c, vec3 d, float t){
  return a + b*cos(6.28318*(c*t + d));
}

// Sample the state texture using the nearest cell for this fragment
vec4 sampleState(vec2 fragCoord){
  vec2 cell = floor(fragCoord * (uGridSize / iResolution));
  vec2 uv = (cell + 0.5)/uGridSize;
  return texture2D(uState, uv);
}

int localPopulation(vec2 fragCoord){
  vec2 cell = floor(fragCoord * (uGridSize / iResolution));
  int n = 0;
  for(int dy=-2; dy<=2; dy++){
    for(int dx=-2; dx<=2; dx++){
      vec2 uv = (cell + vec2(dx,dy) + 0.5)/uGridSize;
      n += int(texture2D(uState, uv).r > 0.5);
    }
  }
  return n;
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  // Psychedelic camera motion: slow zoom + pan + rotation
  float p = iPsychedelia;
  float pp = p * p;
  float zoom = 1.0 + pp * 1.0 * sin(iTime * 0.15);
  float angle = pp * 0.6 * sin(iTime * 0.11);
  vec2 center = iResolution * 0.5 + vec2(sin(iTime*0.17), cos(iTime*0.13)) * (pp * 200.0);
  vec2 fc = fragCoord - center;
  float ca = cos(angle), sa = sin(angle);
  vec2 rot = vec2(ca*fc.x - sa*fc.y, sa*fc.x + ca*fc.y);
  // Add gentle swirl based on radius
  float r = length(fc) / max(iResolution.x, iResolution.y);
  float swirl = pp * 1.2 * sin(iTime * 0.5 + r * 6.0);
  float cs = cos(swirl), ss = sin(swirl);
  rot = vec2(cs*rot.x - ss*rot.y, ss*rot.x + cs*rot.y);
  fragCoord = rot / zoom + center;

  // Kaleidoscopic mirroring for style 4 before sampling
  if (int(iVisualStyle) == 4) {
    vec2 ccenter = iResolution * 0.5;
    vec2 dv = fragCoord - ccenter;
    fragCoord = abs(dv) + ccenter;
  }
  vec4 s = sampleState(fragCoord);
  float alive = step(0.5, s.r);
  float age = s.g;

  // Palettes
  float t = iTime * 0.08;
  vec3 aurora = palette(vec3(0.5), vec3(0.5), vec3(1.0, 0.5, 0.25), vec3(0.00, 0.15, 0.20), age*1.5 + t);
  vec3 sunset = palette(vec3(0.6,0.4,0.3), vec3(0.4,0.4,0.4), vec3(1.0,0.5,0.2), vec3(0.2,0.3,0.4), age*1.2 + t*0.7);
  vec3 cyber  = palette(vec3(0.25,0.2,0.3), vec3(0.7,0.8,0.9), vec3(0.9,0.3,0.2), vec3(0.3,0.2,0.1), age*1.8 + t*1.1);
  vec3 icefire= palette(vec3(0.2,0.3,0.5), vec3(0.8,0.6,0.4), vec3(0.1,0.7,1.0), vec3(0.2,0.1,0.0), age*1.4 + t*0.9);

  vec3 baseColor;
  if (int(iColorMappingMode) == 0) {
    // Age-based with palette cycling
    baseColor = mix(aurora, cyber, 0.5 + 0.5*sin(iTime*0.15));
    baseColor *= smoothstep(0.0, 0.15, age) * (0.6 + 0.4*age);
  } else if (int(iColorMappingMode) == 1) {
    // Population heat-map
    int pop = localPopulation(fragCoord);
    float d = float(pop)/25.0;
    baseColor = mix(icefire, sunset, d);
  } else if (int(iColorMappingMode) == 2) {
    // Velocity-ish: use local gradient of age
    vec2 px = 1.0 / iResolution;
    float ax = sampleState(fragCoord + vec2(px.x,0.0)).g - sampleState(fragCoord - vec2(px.x,0.0)).g;
    float ay = sampleState(fragCoord + vec2(0.0,px.y)).g - sampleState(fragCoord - vec2(0.0,px.y)).g;
    float m = length(vec2(ax,ay));
    baseColor = mix(aurora, cyber, clamp(m*4.0, 0.0, 1.0));
    } else {
    // Multi-layer vibe: shimmer with depth parameter
    float layers = max(1.0, iMultiLayerDepth);
    float k = fract(age*layers + iTime*0.2);
    baseColor = mix(sunset, icefire, k);
  }

  // Channel mode
  if (int(iRgbChannelMode) == 1) {
    // Cross-channel: rotate hues subtly
    baseColor = baseColor.bgr;
  } else if (int(iRgbChannelMode) == 2) {
    // Unified: desaturate slightly and boost brightness
    float g = dot(baseColor, vec3(0.299,0.587,0.114));
    baseColor = mix(vec3(g), baseColor, 0.6) * 1.1;
  }

  // Emissive look for alive cells, retain faint trails for dead cells via age
  vec3 color = mix(baseColor * age * 0.35, baseColor, alive);

  // Stylized cell edges
  vec2 cellUV = fract(fragCoord * (1.0 / iCellSize));
  float border = smoothstep(0.0, 0.08, max(abs(cellUV.x-0.5), abs(cellUV.y-0.5)) - 0.46);
  color *= (1.0 - 0.35*border);

  // Curated visual styles
  if (int(iVisualStyle) == 1) {
    // Sunset Bloom: warmer bias and soft glow
    color *= vec3(1.08, 1.03, 0.95);
  } else if (int(iVisualStyle) == 2) {
    // Cyber Flux: subtle channel rotation
    color = mix(color, color.bgr, 0.25 + 0.25*sin(iTime*0.8));
  } else if (int(iVisualStyle) == 3) {
    // Ice & Fire: contrast push
    float l = dot(color, vec3(0.299,0.587,0.114));
    color = mix(vec3(l*0.8), color*1.2, 0.7);
  } else if (int(iVisualStyle) == 4) {
    // Kaleido Zoom: mirrored quadrants
    vec2 uvn = (gl_FragCoord.xy / iResolution) * 2.0 - 1.0;
    uvn = abs(uvn);
    float k = smoothstep(0.3, 1.2, 1.0 - length(uvn)) * 0.5;
    color = mix(color, color.bgr * 1.1, k);
  }

  // Chromatic aberration shimmer tied to psychedelia
  if (p > 0.001) {
    float off = 0.5 * p + 1.2 * pp;
    vec2 dir = normalize(vec2(cos(iTime*0.7), sin(iTime*0.9)));
    vec3 ca;
    ca.r = texture2D(uState, ((floor((gl_FragCoord.xy + dir*off) * (uGridSize / iResolution)) + 0.5) / uGridSize)).r;
    ca.g = texture2D(uState, ((floor((gl_FragCoord.xy - dir*off) * (uGridSize / iResolution)) + 0.5) / uGridSize)).r;
    ca.b = texture2D(uState, ((floor((gl_FragCoord.xy + dir.yx*off) * (uGridSize / iResolution)) + 0.5) / uGridSize)).r;
    vec3 tint = mix(vec3(1.0), vec3(0.9,1.05,1.1), 0.25 + 0.5*age);
    color = mix(color, clamp(color + 0.55*ca*tint, 0.0, 1.0), 0.45*pp + 0.2*p);
  }

  gl_FragColor = vec4(color, 1.0);
}
`

@Effect({
    author: 'hyperb1iss',
    description:
        "Mathematical cellular automata - Conway's Game of Life, Rule 30, Rule 110, and more with stunning RGB evolution",
    name: 'Cellular Automaton RGB',
})
export class CellularAutomatonEffect extends WebGLEffect<CellularAutomatonControls> {
    // Rendering pipeline
    private webgl: WebGLContext | null = null
    private simMaterial: THREE.ShaderMaterial | null = null
    private displayMaterial: THREE.ShaderMaterial | null = null
    private quad: THREE.Mesh | null = null
    private rtA: THREE.WebGLRenderTarget | null = null
    private rtB: THREE.WebGLRenderTarget | null = null
    private usingA = true

    // Dynamics
    private lastTime = 0
    private simAccumulator = 0
    private simRate = 12

    // Cached controls for reallocation/seed
    private lastCellSize = -1
    private lastInitialPattern = -1
    private lastRule = -1
    private readonly automatonRules = [
        "Conway's Game of Life",
        'Rule 30 (Chaos)',
        'Rule 110 (Turing Complete)',
        "Brian's Brain",
        "Langton's Ant",
        'Multi-Layer Hybrid',
    ]

    private readonly initialPatterns = ['Random Seed', 'Classic Glider', 'Oscillators', 'Moving Puffer', 'Custom Waves']

    private readonly colorMappingModes = ['Age-Based', 'Population Density', 'Velocity Field', 'Multi-Layer RGB']

    private readonly rgbChannelModes = ['Independent Evolution', 'Cross-Channel Interaction', 'Unified State']

    private readonly visualStyles = ['Aurora Dream', 'Sunset Bloom', 'Cyber Flux', 'Ice & Fire', 'Kaleido Zoom']

    @ComboboxControl({
        default: "Conway's Game of Life",
        label: 'Automaton Rule',
        tooltip: 'Choose the mathematical rule governing cellular evolution',
        values: [
            "Conway's Game of Life",
            'Rule 30 (Chaos)',
            'Rule 110 (Turing Complete)',
            "Brian's Brain",
            "Langton's Ant",
            'Multi-Layer Hybrid',
        ],
    })
    automatonRule!: string

    @NumberControl({
        default: 30,
        label: 'Evolution Speed',
        max: 200,
        min: 5,
        tooltip: 'Speed of generational evolution - how fast life evolves',
    })
    evolutionSpeed!: number

    @ComboboxControl({
        default: 'Random Seed',
        label: 'Initial Pattern',
        tooltip: 'Starting configuration for cellular evolution',
        values: ['Random Seed', 'Classic Glider', 'Oscillators', 'Moving Puffer', 'Custom Waves'],
    })
    initialPattern!: string

    @ComboboxControl({
        default: 'Age-Based',
        label: 'Color Mapping',
        tooltip: 'How cellular properties map to RGB colors',
        values: ['Age-Based', 'Population Density', 'Velocity Field', 'Multi-Layer RGB'],
    })
    colorMappingMode!: string

    @NumberControl({
        default: 8,
        label: 'Cell Size',
        max: 20,
        min: 2,
        tooltip: 'Size of individual cells - larger cells show more detail',
    })
    cellSize!: number

    @BooleanControl({
        default: true,
        label: 'Wrap Around',
        tooltip: 'Toroidal topology - cells wrap around edges like Pac-Man',
    })
    wrapAround!: boolean

    @NumberControl({
        default: 8,
        label: 'Birth Rule',
        max: 255,
        min: 0,
        tooltip: 'Custom birth conditions (binary: which neighbor counts birth cells)',
    })
    birthRule!: number

    @NumberControl({
        default: 12,
        label: 'Survival Rule',
        max: 255,
        min: 0,
        tooltip: 'Custom survival conditions (binary: which neighbor counts keep cells alive)',
    })
    survivalRule!: number

    @NumberControl({
        default: 40,
        label: 'Trail Effect',
        max: 100,
        min: 0,
        tooltip: 'Visualize cellular history - see the ghosts of past generations',
    })
    trailEffect!: number

    @BooleanControl({
        default: true,
        label: 'Generation Counter',
        tooltip: 'Display evolution generation counter',
    })
    generationCounter!: boolean

    @ComboboxControl({
        default: 'Independent Evolution',
        label: 'RGB Channel Mode',
        tooltip: 'How R, G, B channels evolve - independently or together',
        values: ['Independent Evolution', 'Cross-Channel Interaction', 'Unified State'],
    })
    rgbChannelMode!: string

    @NumberControl({
        default: 3,
        label: 'Multi-Layer Depth',
        max: 8,
        min: 1,
        tooltip: 'Number of automaton layers for complex interactions',
    })
    multiLayerDepth!: number

    @ComboboxControl({
        default: 'Aurora Dream',
        label: 'Visual Style',
        tooltip: 'Curated palette and post-processing style',
        values: ['Aurora Dream', 'Sunset Bloom', 'Cyber Flux', 'Ice & Fire', 'Kaleido Zoom'],
    })
    visualStyle!: string

    @NumberControl({
        default: 20,
        label: 'Psychedelia',
        max: 100,
        min: 0,
        tooltip: 'Zoom, pan, and chromatic flair intensity',
    })
    psychedelia!: number

    @NumberControl({
        default: 5,
        label: 'Entropy',
        max: 100,
        min: 0,
        tooltip: 'Chance per step to spawn chaos seeds (prevents stagnation)',
    })
    entropy!: number

    constructor() {
        super({
            debug: true,
            fragmentShader: displayFragmentShader,
            id: 'cellular-automaton',
            name: 'Cellular Automaton RGB',
        })
    }

    protected initializeControls(): void {
        const w = window as Record<string, unknown>
        w.automatonRule = "Conway's Game of Life"
        w.evolutionSpeed = 30
        w.initialPattern = 'Random Seed'
        w.colorMappingMode = 'Age-Based'
        w.cellSize = 8
        w.wrapAround = 1
        w.birthRule = 8
        w.survivalRule = 12
        w.trailEffect = 40
        w.generationCounter = 1
        w.rgbChannelMode = 'Independent Evolution'
        w.multiLayerDepth = 3
        w.visualStyle = 'Aurora Dream'
        w.psychedelia = 20
        w.entropy = 5
    }

    // Custom renderer: create ping-pong simulation pipeline
    protected async initializeRenderer(): Promise<void> {
        if (!this.canvas) throw new Error('Canvas not available for WebGL initialization')

        // Initialize context
        this.webgl = initializeWebGL({
            canvasHeight: this.canvasHeight,
            canvasId: this.canvas.id,
            canvasWidth: this.canvasWidth,
        })
        const uniforms = createStandardUniforms(this.webgl.canvas)

        // Display material and quad
        this.displayMaterial = new THREE.ShaderMaterial({
            fragmentShader: displayFragmentShader,
            uniforms: {
                ...uniforms,
                iCellSize: { value: 8.0 },
                iColorMappingMode: { value: 0.0 },
                iGenerationCounter: { value: 1.0 },
                iMultiLayerDepth: { value: 3.0 },
                iPsychedelia: { value: 0.0 },
                iRgbChannelMode: { value: 0.0 },
                iTrailEffect: { value: 0.8 },
                iVisualStyle: { value: 0.0 },
                uGridSize: { value: new THREE.Vector2(64, 40) },
                uState: { value: null },
            },
            vertexShader: THREE.ShaderLib.basic.vertexShader,
        })
        const geometry = new THREE.PlaneGeometry(2, 2)
        this.quad = new THREE.Mesh(geometry, this.displayMaterial)
        this.webgl.scene.add(this.quad)
        // Ensure base class update() path runs our updateUniforms()
        this.material = this.displayMaterial

        // Sim material
        this.simMaterial = new THREE.ShaderMaterial({
            fragmentShader: simFragmentShader,
            uniforms: {
                iAutomatonRule: { value: 0.0 },
                iBirthRule: { value: 8.0 },
                iEntropy: { value: 0.02 },
                iSurvivalRule: { value: 12.0 },
                iTrailEffect: { value: 0.8 },
                iWrapAround: { value: 1.0 },
                uGridSize: { value: new THREE.Vector2(64, 40) },
                uPrevState: { value: null },
            },
            vertexShader: THREE.ShaderLib.basic.vertexShader,
        })

        // Allocate and seed
        this.allocateRenderTargets({ cellSize: 8 } as CellularAutomatonControls)
        this.seedState({
            automatonRule: 0,
            birthRule: 8,
            cellSize: 8,
            colorMappingMode: 0,
            entropy: 0.02,
            evolutionSpeed: 0.6,
            generationCounter: true,
            initialPattern: 0,
            multiLayerDepth: 3,
            psychedelia: 0.2,
            rgbChannelMode: 0,
            survivalRule: 12,
            trailEffect: 0.8,
            visualStyle: 0,
            wrapAround: true,
        })
    }

    protected render(time: number): void {
        if (!this.webgl || !this.simMaterial || !this.displayMaterial || !this.rtA || !this.rtB || !this.quad) return

        // Update time
        this.displayMaterial.uniforms.iTime.value = time

        // Fixed-step simulation accumulator (derive rate from evolutionSpeed via last set uniforms)
        if (this.lastTime === 0) this.lastTime = time
        const dt = Math.max(0, Math.min(0.1, time - this.lastTime))
        this.lastTime = time
        this.simAccumulator += dt * this.simRate

        // Use the same quad but swap materials for sim pass
        const { renderer, scene, camera } = this.webgl
        const originalMaterial = this.quad.material
        this.quad.material = this.simMaterial

        while (this.simAccumulator >= 1.0) {
            const read = this.usingA ? this.rtA : this.rtB
            const write = this.usingA ? this.rtB : this.rtA
            this.simMaterial.uniforms.uPrevState.value = read.texture
            renderer.setRenderTarget(write)
            renderer.render(scene, camera)
            this.usingA = !this.usingA
            this.simAccumulator -= 1.0
        }

        // Display pass with subtle camera jitter for visual interest (scaled by psychedelia)
        this.quad.material = originalMaterial
        const current = this.usingA ? this.rtA : this.rtB
        this.displayMaterial.uniforms.uState.value = current.texture
        renderer.setRenderTarget(null)
        const jitter = 0.0025 * (this.displayMaterial.uniforms.iPsychedelia.value as number)
        const ox = (Math.random() - 0.5) * jitter
        const oy = (Math.random() - 0.5) * jitter
        this.quad.position.set(ox, oy, 0)
        renderer.render(scene, camera)
        this.quad.position.set(0, 0, 0)
    }

    private getGridSize(controls: Pick<CellularAutomatonControls, 'cellSize'>): { x: number; y: number } {
        const canvas = this.webgl?.canvas
        const size = Math.max(2, Math.floor(controls.cellSize))
        const w = canvas ? Math.max(2, Math.floor(canvas.width / size)) : 64
        const h = canvas ? Math.max(2, Math.floor(canvas.height / size)) : 40
        return { x: w, y: h }
    }

    private allocateRenderTargets(controls: Pick<CellularAutomatonControls, 'cellSize'>): void {
        if (!this.webgl) return
        const { x: gw, y: gh } = this.getGridSize(controls)
        const params: THREE.RenderTargetOptions = {
            depthBuffer: false,
            magFilter: THREE.NearestFilter,
            minFilter: THREE.NearestFilter,
            stencilBuffer: false,
        }
        this.rtA?.dispose()
        this.rtB?.dispose()
        this.rtA = new THREE.WebGLRenderTarget(gw, gh, params)
        this.rtB = new THREE.WebGLRenderTarget(gw, gh, params)
        if (this.simMaterial) this.simMaterial.uniforms.uGridSize.value = new THREE.Vector2(gw, gh)
        if (this.displayMaterial) this.displayMaterial.uniforms.uGridSize.value = new THREE.Vector2(gw, gh)
        this.usingA = true
    }

    private seedState(controls: CellularAutomatonControls): void {
        if (!this.webgl || !this.simMaterial || !this.rtA || !this.rtB || !this.quad) return
        const { renderer, scene, camera } = this.webgl

        const seedMat = new THREE.ShaderMaterial({
            fragmentShader: `
            precision mediump float;
            uniform vec2 uGridSize;
            uniform float iInitialPattern;
            uniform float iTime;
            float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
            void main(){
              vec2 cell = floor(gl_FragCoord.xy);
              vec2 uv = (cell+0.5)/uGridSize;
              float alive = 0.0;
              if (int(iInitialPattern)==0) {
                alive = step(0.76, rand(uv*vec2(983.2,127.5)));
              } else if (int(iInitialPattern)==1) {
                vec2 c = cell - (uGridSize*0.5);
                alive = float((c==vec2(0.0,1.0))||(c==vec2(1.0,2.0))||(c==vec2(2.0,0.0))||(c==vec2(2.0,1.0))||(c==vec2(2.0,2.0)));
              } else if (int(iInitialPattern)==2) {
                alive = step(0.5, step(0.0, mod(cell.x, 6.0)-2.5) * step(0.0, 2.5-mod(cell.y,6.0)));
              } else if (int(iInitialPattern)==3) {
                vec2 d = cell - (uGridSize*0.5 + vec2(sin(iTime)*8.0, cos(iTime*1.2)*6.0));
                alive = step(length(d), 4.5);
              } else {
                float w = sin(cell.x*0.21)+cos(cell.y*0.17);
                alive = step(1.2, w);
              }
              float age = alive * 0.3;
              gl_FragColor = vec4(alive, age, 0.0, 1.0);
            }
            `,
            uniforms: {
                iInitialPattern: { value: controls.initialPattern },
                iTime: { value: 0 },
                uGridSize: { value: this.simMaterial.uniforms.uGridSize.value },
            },
            vertexShader: THREE.ShaderLib.basic.vertexShader,
        })

        const oldMat = this.quad.material
        this.quad.material = seedMat
        renderer.setRenderTarget(this.rtA)
        renderer.render(scene, camera)
        renderer.setRenderTarget(this.rtB)
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)
        this.quad.material = oldMat
        seedMat.dispose()
    }
    protected getControlValues(): CellularAutomatonControls {
        const w = window as Record<string, unknown>

        const automatonIndex = comboboxValueToIndex(
            (w.automatonRule as string | number | undefined) ?? "Conway's Game of Life",
            this.automatonRules,
            0,
        )

        const patternIndex = comboboxValueToIndex(
            (w.initialPattern as string | number | undefined) ?? 'Random Seed',
            this.initialPatterns,
            0,
        )

        const colorModeIndex = comboboxValueToIndex(
            (w.colorMappingMode as string | number | undefined) ?? 'Age-Based',
            this.colorMappingModes,
            0,
        )

        const channelModeIndex = comboboxValueToIndex(
            (w.rgbChannelMode as string | number | undefined) ?? 'Independent Evolution',
            this.rgbChannelModes,
            0,
        )

        const styleIndex = comboboxValueToIndex(
            (w.visualStyle as string | number | undefined) ?? 'Aurora Dream',
            this.visualStyles,
            0,
        )

        return {
            automatonRule: automatonIndex,
            birthRule: Math.round((((w.birthRule as number) ?? 8) / 100) * 255), // 0-255
            cellSize: 2 + normalizePercentage((w.cellSize as number) ?? 8, 10, 0.2) * 18, // 2-20 range
            colorMappingMode: colorModeIndex,
            entropy: normalizePercentage((w.entropy as number) ?? 5, 100, 0.0),
            evolutionSpeed: normalizePercentage((w.evolutionSpeed as number) ?? 30, 100, 0.05) * 2.0,
            generationCounter: Boolean(boolToInt((w.generationCounter as number | boolean | undefined) ?? true)),
            initialPattern: patternIndex,
            multiLayerDepth: Math.round(1 + ((((w.multiLayerDepth as number) ?? 3) - 1) / 7) * 7), // 1-8 range
            psychedelia: normalizePercentage((w.psychedelia as number) ?? 20, 100, 0.0),
            rgbChannelMode: channelModeIndex,
            survivalRule: Math.round((((w.survivalRule as number) ?? 12) / 100) * 255), // 0-255
            trailEffect: normalizePercentage((w.trailEffect as number) ?? 40, 100, 0.0) * 2.0,
            visualStyle: styleIndex,
            wrapAround: Boolean(boolToInt((w.wrapAround as number | boolean | undefined) ?? true)),
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        // Unused by overridden renderer but required by base class
        return {
            iAutomatonRule: { value: 0.0 },
            iBirthRule: { value: 8.0 },
            iCellSize: { value: 8.0 },
            iColorMappingMode: { value: 0.0 },
            iEvolutionSpeed: { value: 0.6 },
            iGenerationCounter: { value: 1.0 },
            iInitialPattern: { value: 0.0 },
            iMultiLayerDepth: { value: 3.0 },
            iRgbChannelMode: { value: 0.0 },
            iSurvivalRule: { value: 12.0 },
            iTrailEffect: { value: 0.8 },
            iWrapAround: { value: 1.0 },
        }
    }

    protected updateUniforms(controls: CellularAutomatonControls): void {
        // Map evolutionSpeed (0..2) to sim steps/sec range ~ 4..48
        this.simRate = Math.round(4 + controls.evolutionSpeed * 22)
        // Allocate or resize render targets on cell size change
        if (this.webgl && (this.lastCellSize <= 0 || Math.abs(this.lastCellSize - controls.cellSize) > 0.5)) {
            this.allocateRenderTargets(controls)
            this.seedState(controls)
            this.lastCellSize = controls.cellSize
        }

        // Reseed on pattern or rule change
        if (controls.initialPattern !== this.lastInitialPattern || controls.automatonRule !== this.lastRule) {
            this.seedState(controls)
            this.lastInitialPattern = controls.initialPattern
            this.lastRule = controls.automatonRule
        }

        // Update sim uniforms
        if (this.simMaterial && this.webgl) {
            const gs = this.getGridSize(controls)
            this.simMaterial.uniforms.uGridSize.value = new THREE.Vector2(gs.x, gs.y)
            this.simMaterial.uniforms.iAutomatonRule.value = controls.automatonRule
            this.simMaterial.uniforms.iBirthRule.value = controls.birthRule
            this.simMaterial.uniforms.iSurvivalRule.value = controls.survivalRule
            this.simMaterial.uniforms.iTrailEffect.value = controls.trailEffect
            this.simMaterial.uniforms.iWrapAround.value = controls.wrapAround ? 1.0 : 0.0
            this.simMaterial.uniforms.iEntropy.value = controls.entropy
        }

        // Update display uniforms
        if (this.displayMaterial && this.webgl) {
            const gs = this.getGridSize(controls)
            this.displayMaterial.uniforms.uGridSize.value = new THREE.Vector2(gs.x, gs.y)
            this.displayMaterial.uniforms.iCellSize.value = controls.cellSize
            this.displayMaterial.uniforms.iColorMappingMode.value = controls.colorMappingMode
            this.displayMaterial.uniforms.iTrailEffect.value = controls.trailEffect
            this.displayMaterial.uniforms.iRgbChannelMode.value = controls.rgbChannelMode
            this.displayMaterial.uniforms.iMultiLayerDepth.value = controls.multiLayerDepth
            this.displayMaterial.uniforms.iGenerationCounter.value = controls.generationCounter ? 1.0 : 0.0
            this.displayMaterial.uniforms.iVisualStyle.value = controls.visualStyle
            this.displayMaterial.uniforms.iPsychedelia.value = controls.psychedelia
            // push time to ensure visualStyle changes take effect immediately in palettes
            this.displayMaterial.uniforms.iTime.value = this.displayMaterial.uniforms.iTime.value
        }
    }
}

// Create and initialize effect
const effect = new CellularAutomatonEffect()
initializeEffect(() => effect.initialize())

export default effect
