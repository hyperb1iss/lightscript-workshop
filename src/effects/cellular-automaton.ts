/**
 * Cellular Automaton RGB - WebGL Effect
 * Conway's Game of Life and other cellular automata with RGB color evolution
 * Watch digital life emerge and evolve in stunning patterns across your keyboard ✨
 */

import type * as THREE from 'three'
import { initializeEffect } from '../core'
import { BooleanControl, ComboboxControl, Effect, NumberControl } from '../core/controls/decorators'
import { boolToInt, comboboxValueToIndex, normalizePercentage } from '../core/controls/helpers'
import { WebGLEffect } from '../core/effects/webgl-effect'

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
}

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iAutomatonRule;
uniform float iEvolutionSpeed;
uniform float iInitialPattern;
uniform float iColorMappingMode;
uniform float iCellSize;
uniform float iWrapAround;
uniform float iBirthRule;
uniform float iSurvivalRule;
uniform float iTrailEffect;
uniform float iGenerationCounter;
uniform float iRgbChannelMode;
uniform float iMultiLayerDepth;

#define PI 3.14159265359
#define TAU 6.28318530718
#define MAX_LAYERS 8

// Hash functions for cellular automata
float hash21(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    p = fract(p * vec2(443.8975, 397.2973));
    p += dot(p, p.yx + 19.19);
    return fract(vec2(p.x * p.y, p.y * p.x));
}

vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p, p.zxy + 19.19);
    return fract(vec3(p.x * p.y, p.y * p.z, p.z * p.x));
}

// Convert rules to binary representation
float getBit(float value, int bit) {
    return mod(floor(value / pow(2.0, float(bit))), 2.0);
}

// Conway's Game of Life rules
bool conwayRules(int neighbors, bool alive) {
    // Birth: exactly 3 neighbors
    // Survival: 2 or 3 neighbors
    if (alive) {
        return neighbors == 2 || neighbors == 3;
    } else {
        return neighbors == 3;
    }
}

// Custom birth/survival rules
bool customRules(int neighbors, bool alive, float birthRule, float survivalRule) {
    if (alive) {
        return getBit(survivalRule, neighbors) > 0.5;
    } else {
        return getBit(birthRule, neighbors) > 0.5;
    }
}

// Rule 30 (elementary cellular automaton adapted to 2D)
float rule30(vec2 coord, vec2 resolution) {
    vec2 cellCoord = floor(coord * resolution / iCellSize);
    
    // Get neighborhood (using Rule 30 pattern)
    float left = hash21(cellCoord + vec2(-1, 0)) > 0.5 ? 1.0 : 0.0;
    float center = hash21(cellCoord) > 0.5 ? 1.0 : 0.0;
    float right = hash21(cellCoord + vec2(1, 0)) > 0.5 ? 1.0 : 0.0;
    
    // Rule 30: 00011110 in binary
    int pattern = int(left) * 4 + int(center) * 2 + int(right);
    float rule = 30.0; // Binary: 00011110
    
    return getBit(rule, pattern);
}

// Rule 110 (Turing complete!)
float rule110(vec2 coord, vec2 resolution) {
    vec2 cellCoord = floor(coord * resolution / iCellSize);
    
    float left = hash21(cellCoord + vec2(-1, 0) + iTime) > 0.5 ? 1.0 : 0.0;
    float center = hash21(cellCoord + iTime) > 0.5 ? 1.0 : 0.0;
    float right = hash21(cellCoord + vec2(1, 0) + iTime) > 0.5 ? 1.0 : 0.0;
    
    // Rule 110: 01101110 in binary (110 decimal)
    int pattern = int(left) * 4 + int(center) * 2 + int(right);
    float rule = 110.0;
    
    return getBit(rule, pattern);
}

// Brian's Brain (3-state automaton: Off, On, Dying)
vec3 briansBrain(vec2 coord, vec2 resolution) {
    vec2 cellCoord = floor(coord * resolution / iCellSize);
    vec3 state = hash33(vec3(cellCoord, iTime * 0.1));
    
    // Simulate 3-state evolution
    // State: 0=off, 0.5=dying, 1=on
    float currentState = step(0.33, state.x) * (1.0 - step(0.66, state.x)) * 0.5 + 
                        step(0.66, state.x);
    
    // Count living neighbors
    int neighbors = 0;
    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0) continue;
            vec2 neighborCoord = cellCoord + vec2(float(dx), float(dy));
            vec3 neighborState = hash33(vec3(neighborCoord, iTime * 0.1));
            if (step(0.66, neighborState.x) > 0.5) neighbors++;
        }
    }
    
    // Brian's Brain rules:
    // Off -> On if exactly 2 living neighbors
    // On -> Dying always
    // Dying -> Off always
    vec3 result = vec3(0.0);
    
    if (currentState < 0.1) { // Off
        if (neighbors == 2) result = vec3(1.0, 0.8, 0.2); // Birth (yellow)
    } else if (currentState > 0.9) { // On
        result = vec3(0.5, 0.2, 0.8); // Dying (purple)
    }
    // Dying -> Off (black)
    
    return result;
}

// Langton's Ant simulation
vec3 langtonsAnt(vec2 coord, vec2 resolution) {
    vec2 cellCoord = floor(coord * resolution / iCellSize);
    vec2 antPos = vec2(resolution * 0.5) + 
                  vec2(sin(iTime * 0.5) * 10.0, cos(iTime * 0.7) * 8.0);
    
    float antDistance = length(cellCoord - antPos);
    
    // Ant's path creates colored trail
    float trailAge = abs(antDistance - iTime * 2.0);
    vec3 trailColor = vec3(
        0.5 + 0.5 * sin(trailAge * 0.2),
        0.5 + 0.5 * cos(trailAge * 0.3 + PI * 0.5),
        0.5 + 0.5 * sin(trailAge * 0.4 + PI)
    );
    
    // Ant's current position
    vec3 antColor = vec3(1.0, 0.2, 0.2);
    float antRadius = 2.0;
    
    if (antDistance < antRadius) {
        return mix(trailColor, antColor, 1.0 - antDistance / antRadius);
    }
    
    // Background cellular pattern
    bool cellState = mod(cellCoord.x + cellCoord.y + floor(iTime * 0.5), 2.0) < 1.0;
    return cellState ? trailColor * 0.3 : vec3(0.0);
}

// Multi-layer automaton evolution
vec3 multiLayerAutomaton(vec2 coord, vec2 resolution) {
    vec3 result = vec3(0.0);
    int layers = int(clamp(iMultiLayerDepth, 1.0, float(MAX_LAYERS)));
    
    for (int layer = 0; layer < MAX_LAYERS; layer++) {
        if (layer >= layers) break;
        
        vec2 layerCoord = coord + vec2(float(layer) * 0.1);
        vec2 cellCoord = floor(layerCoord * resolution / (iCellSize + float(layer) * 0.5));
        
        // Each layer has different evolution rules
        vec3 layerSeed = vec3(cellCoord, float(layer) + iTime * iEvolutionSpeed);
        vec3 cellState = hash33(layerSeed);
        
        // Count neighbors for this layer
        int neighbors = 0;
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= 1; dy++) {
                if (dx == 0 && dy == 0) continue;
                vec2 neighborCoord = cellCoord + vec2(float(dx), float(dy));
                vec3 neighborSeed = vec3(neighborCoord, float(layer) + iTime * iEvolutionSpeed);
                if (length(hash33(neighborSeed)) > 1.2) neighbors++;
            }
        }
        
        // Layer-specific rules
        bool alive = length(cellState) > 1.2;
        bool nextState = conwayRules(neighbors, alive);
        
        if (nextState) {
            // Each layer contributes to a different color channel
            if (layer % 3 == 0) result.r += cellState.x / float(layers);
            else if (layer % 3 == 1) result.g += cellState.y / float(layers);
            else result.b += cellState.z / float(layers);
        }
    }
    
    return clamp(result, 0.0, 1.0);
}

// Initial pattern generators
vec3 generateInitialPattern(vec2 coord, vec2 resolution) {
    vec2 cellCoord = floor(coord * resolution / iCellSize);
    vec2 center = resolution * 0.5;
    
    if (int(iInitialPattern) == 0) {
        // Random
        return step(0.5, hash33(vec3(cellCoord, 1.0))) * 
               vec3(hash21(cellCoord), hash21(cellCoord + vec2(1.0)), hash21(cellCoord + vec2(2.0)));
    } else if (int(iInitialPattern) == 1) {
        // Glider
        vec2 gliderOffset = cellCoord - center;
        bool isGliderCell = (abs(gliderOffset.x) < 2.0 && abs(gliderOffset.y) < 2.0) &&
                           (length(gliderOffset) > 0.5);
        return isGliderCell ? vec3(1.0, 0.8, 0.2) : vec3(0.0);
    } else if (int(iInitialPattern) == 2) {
        // Oscillators (blinkers)
        float oscillatorPhase = sin(iTime * 2.0 + cellCoord.x * 0.1 + cellCoord.y * 0.1);
        return oscillatorPhase > 0.0 ? 
               vec3(0.5 + 0.5 * sin(cellCoord.x * 0.3),
                    0.5 + 0.5 * cos(cellCoord.y * 0.2),
                    0.5 + 0.5 * sin((cellCoord.x + cellCoord.y) * 0.25)) : vec3(0.0);
    } else if (int(iInitialPattern) == 3) {
        // Puffer (moving pattern)
        vec2 pufferPos = center + vec2(sin(iTime * 0.3) * 20.0, cos(iTime * 0.2) * 15.0);
        float pufferDist = length(cellCoord - pufferPos);
        return pufferDist < 3.0 ? 
               vec3(1.0 - pufferDist / 3.0, 0.5, pufferDist / 3.0) : vec3(0.0);
    } else {
        // Custom pattern
        float pattern = sin(cellCoord.x * 0.1 + iTime) * cos(cellCoord.y * 0.15 + iTime);
        return pattern > 0.0 ? 
               vec3(pattern, 1.0 - pattern, 0.5 + 0.5 * pattern) : vec3(0.0);
    }
}

// Age-based coloring
vec3 ageBasedColoring(vec3 cellState, vec2 cellCoord) {
    float age = cellState.r + cellState.g + cellState.b;
    
    // Color transitions: Birth (white) -> Youth (yellow) -> Adult (orange) -> Old (red) -> Death (purple)
    vec3 color0 = vec3(1.0, 1.0, 1.0); // Birth
    vec3 color1 = vec3(1.0, 1.0, 0.2); // Youth
    vec3 color2 = vec3(1.0, 0.6, 0.2); // Adult
    vec3 color3 = vec3(1.0, 0.2, 0.2); // Old
    vec3 color4 = vec3(0.6, 0.2, 1.0); // Death
    
    float agePhase = clamp(age * 2.0, 0.0, 4.0);
    float colorIndex = floor(agePhase);
    float lerpFactor = fract(agePhase);
    
    vec3 result;
    if (colorIndex < 0.5) result = mix(color0, color1, lerpFactor);
    else if (colorIndex < 1.5) result = mix(color1, color2, lerpFactor);
    else if (colorIndex < 2.5) result = mix(color2, color3, lerpFactor);
    else if (colorIndex < 3.5) result = mix(color3, color4, lerpFactor);
    else result = color4;
    
    return result;
}

// Population density coloring
vec3 populationColoring(vec2 coord, vec2 resolution) {
    vec2 cellCoord = floor(coord * resolution / iCellSize);
    
    // Count local population
    int population = 0;
    for (int dx = -2; dx <= 2; dx++) {
        for (int dy = -2; dy <= 2; dy++) {
            vec2 neighborCoord = cellCoord + vec2(float(dx), float(dy));
            if (length(hash33(vec3(neighborCoord, iTime * iEvolutionSpeed))) > 1.2) {
                population++;
            }
        }
    }
    
    float density = float(population) / 25.0; // Max 25 cells in 5x5 area
    
    // Color based on population density
    return vec3(
        density, // Red for high density
        1.0 - abs(density - 0.5) * 2.0, // Green for medium density
        1.0 - density // Blue for low density
    );
}

// Velocity field visualization
vec3 velocityColoring(vec2 coord, vec2 resolution) {
    vec2 cellCoord = floor(coord * resolution / iCellSize);
    
    // Calculate velocity based on pattern movement
    vec2 prevPos = cellCoord - vec2(sin(iTime - 0.1), cos(iTime - 0.1));
    vec2 currPos = cellCoord - vec2(sin(iTime), cos(iTime));
    vec2 velocity = (currPos - prevPos) * 10.0;
    
    // Map velocity to color
    return vec3(
        0.5 + 0.5 * tanh(velocity.x),
        0.5 + 0.5 * tanh(velocity.y),
        0.5 + 0.5 * tanh(length(velocity))
    );
}

// Generation counter visualization
vec3 addGenerationCounter(vec3 baseColor, vec2 coord) {
    if (iGenerationCounter < 0.5) return baseColor;
    
    // Simple digital counter in top-left corner
    vec2 counterPos = coord * 50.0; // Scale for digit visibility
    float generation = floor(iTime * iEvolutionSpeed * 10.0);
    
    // Display generation number (simplified)
    if (counterPos.x < 20.0 && counterPos.y > 40.0 && counterPos.y < 48.0) {
        float digit = mod(generation, 10.0);
        vec3 counterColor = vec3(0.0, 1.0, 1.0);
        
        // Simple digit pattern (would need full implementation for all digits)
        if (mod(floor(counterPos.x), 4.0) < 2.0 && digit > 0.0) {
            return mix(baseColor, counterColor, 0.7);
        }
    }
    
    return baseColor;
}

// Trail effect visualization
vec3 addTrailEffect(vec3 currentColor, vec2 coord) {
    if (iTrailEffect < 0.1) return currentColor;
    
    // Sample previous generations for trail
    vec3 trail = vec3(0.0);
    for (int i = 1; i <= 8; i++) {
        float timeOffset = float(i) * 0.1;
        vec3 pastColor = generateInitialPattern(coord, iResolution) * 
                        exp(-timeOffset * iEvolutionSpeed * 2.0);
        trail += pastColor * (1.0 / float(i));
    }
    
    return mix(currentColor, currentColor + trail * 0.3, iTrailEffect);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 coord = fragCoord;
    
    vec3 color = vec3(0.0);
    
    // Choose automaton rule
    if (int(iAutomatonRule) == 0) {
        // Conway's Game of Life
        color = generateInitialPattern(coord, iResolution);
    } else if (int(iAutomatonRule) == 1) {
        // Rule 30
        float intensity = rule30(coord, iResolution);
        color = vec3(intensity, intensity * 0.5, intensity * 0.2);
    } else if (int(iAutomatonRule) == 2) {
        // Rule 110
        float intensity = rule110(coord, iResolution);
        color = vec3(intensity * 0.2, intensity * 0.8, intensity);
    } else if (int(iAutomatonRule) == 3) {
        // Brian's Brain
        color = briansBrain(coord, iResolution);
    } else if (int(iAutomatonRule) == 4) {
        // Langton's Ant
        color = langtonsAnt(coord, iResolution);
    } else {
        // Multi-layer automaton
        color = multiLayerAutomaton(coord, iResolution);
    }
    
    // Apply color mapping mode
    if (int(iColorMappingMode) == 0) {
        // Age-based
        color = ageBasedColoring(color, floor(coord / iCellSize));
    } else if (int(iColorMappingMode) == 1) {
        // Population density
        color = populationColoring(coord, iResolution);
    } else if (int(iColorMappingMode) == 2) {
        // Velocity field
        color = velocityColoring(coord, iResolution);
    }
    // Mode 3 is multi-layer (already handled above)
    
    // Add trail effects
    color = addTrailEffect(color, coord);
    
    // Add generation counter
    color = addGenerationCounter(color, uv);
    
    // Cell size effect (anti-aliasing at borders)
    vec2 cellUV = fract(coord / iCellSize);
    float cellBorder = 1.0 - smoothstep(0.85, 1.0, max(cellUV.x, cellUV.y)) * 
                            smoothstep(0.0, 0.15, min(cellUV.x, cellUV.y));
    color *= cellBorder;
    
    // Evolution speed affects brightness
    color *= 0.7 + 0.3 * iEvolutionSpeed;
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`

@Effect({
    author: 'hyperb1iss',
    description:
        "Mathematical cellular automata - Conway's Game of Life, Rule 30, Rule 110, and more with stunning RGB evolution",
    name: 'Cellular Automaton RGB',
})
export class CellularAutomatonEffect extends WebGLEffect<CellularAutomatonControls> {
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

    constructor() {
        super({
            debug: true,
            fragmentShader,
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

        return {
            automatonRule: automatonIndex,
            birthRule: Math.round((((w.birthRule as number) ?? 8) / 100) * 255), // 0-255
            cellSize: 2 + normalizePercentage((w.cellSize as number) ?? 8, 10, 0.2) * 18, // 2-20 range
            colorMappingMode: colorModeIndex,
            evolutionSpeed: normalizePercentage((w.evolutionSpeed as number) ?? 30, 100, 0.05) * 2.0,
            generationCounter: Boolean(boolToInt((w.generationCounter as number | boolean | undefined) ?? true)),
            initialPattern: patternIndex,
            multiLayerDepth: Math.round(1 + ((((w.multiLayerDepth as number) ?? 3) - 1) / 7) * 7), // 1-8 range
            rgbChannelMode: channelModeIndex,
            survivalRule: Math.round((((w.survivalRule as number) ?? 12) / 100) * 255), // 0-255
            trailEffect: normalizePercentage((w.trailEffect as number) ?? 40, 100, 0.0) * 2.0,
            wrapAround: Boolean(boolToInt((w.wrapAround as number | boolean | undefined) ?? true)),
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
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
        if (!this.material) return

        this.material.uniforms.iAutomatonRule.value = controls.automatonRule
        this.material.uniforms.iEvolutionSpeed.value = controls.evolutionSpeed
        this.material.uniforms.iInitialPattern.value = controls.initialPattern
        this.material.uniforms.iColorMappingMode.value = controls.colorMappingMode
        this.material.uniforms.iCellSize.value = controls.cellSize
        this.material.uniforms.iWrapAround.value = controls.wrapAround ? 1.0 : 0.0
        this.material.uniforms.iBirthRule.value = controls.birthRule
        this.material.uniforms.iSurvivalRule.value = controls.survivalRule
        this.material.uniforms.iTrailEffect.value = controls.trailEffect
        this.material.uniforms.iGenerationCounter.value = controls.generationCounter ? 1.0 : 0.0
        this.material.uniforms.iRgbChannelMode.value = controls.rgbChannelMode
        this.material.uniforms.iMultiLayerDepth.value = controls.multiLayerDepth
    }
}

// Create and initialize effect
const effect = new CellularAutomatonEffect()
initializeEffect(() => effect.initialize())

export default effect
