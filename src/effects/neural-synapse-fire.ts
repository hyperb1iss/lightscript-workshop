/**
 * Neural Synapse Fire - WebGL Effect
 * Visualizes neural network activation patterns with real ML mathematics
 * Watch a brain think in real-time through cascading light patterns
 */

import {
    BooleanControl,
    boolToInt,
    ComboboxControl,
    comboboxValueToIndex,
    Effect,
    initializeEffect,
    NumberControl,
    normalizePercentage,
    WebGLEffect,
} from '@lightscript/core'
import type * as THREE from 'three'

export interface NeuralSynapseFireControls {
    networkDepth: number // 2-8 layers
    learningRate: number // 0-1 - affects backprop speed
    activationFunction: number // 0-2 - ReLU, Sigmoid, Tanh
    neuronDensity: number // 0-2 - neurons per layer
    connectionStrength: number // 0-2 - weight matrix visualization
    trainingMode: boolean // forward vs backprop visualization
    dropoutRate: number // 0-0.8 - neural regularization
    batchNormalization: boolean // enable batch norm visualization
    gradientFlow: number // 0-2 - backprop intensity
    lossLandscape: boolean // visualize loss surface
    synapticPlasticity: number // 0-1 - connection adaptation
    neuralOscillation: number // 0-2 - brain wave patterns
    masterIntensity: number // 0-2 - global brightness control
    quality: number // 0.5-2 - trades detail for speed
    connSamples: number // 0-2 - how many connection samples per layer (scaled)
    gridIntensity: number // 0-1 - background grid strength
}

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iNetworkDepth;
uniform float iLearningRate;
uniform float iActivationFunction;
uniform float iNeuronDensity;
uniform float iConnectionStrength;
uniform float iTrainingMode;
uniform float iDropoutRate;
uniform float iBatchNormalization;
uniform float iGradientFlow;
uniform float iLossLandscape;
uniform float iSynapticPlasticity;
uniform float iNeuralOscillation;
uniform float iMaster;
uniform float iQuality;
uniform float iConnSamples;
uniform float iGridIntensity;

// Neural network constants
#define MAX_LAYERS 8
#define PI 3.14159265359
#define TAU 6.28318530718

// Hash functions for deterministic randomness
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

// Activation functions - real ML math
float relu(float x) {
    return max(0.0, x);
}

float sigmoid(float x) {
    return 1.0 / (1.0 + exp(-x));
}

float tanh_activation(float x) {
    return tanh(x);
}

// Activation function selector
float activate(float x, int func) {
    if (func == 0) return relu(x);
    if (func == 1) return sigmoid(x);
    return tanh_activation(x);
}

// Derivative for backpropagation
float activateDerivative(float x, int func) {
    if (func == 0) return x > 0.0 ? 1.0 : 0.0; // ReLU derivative
    if (func == 1) {
        float s = sigmoid(x);
        return s * (1.0 - s); // Sigmoid derivative
    }
    float t = tanh_activation(x);
    return 1.0 - t * t; // Tanh derivative
}

// Neural network layer computation
struct Layer {
    vec2 position;
    float activation;
    float gradient;
    bool dropout;
};

// Compute neuron position in layer
vec2 getNeuronPosition(int layer, int neuron, int totalNeurons) {
    float layerX = -0.8 + (float(layer) / (iNetworkDepth - 1.0)) * 1.6;
    float neuronY = -0.6 + (float(neuron) / float(totalNeurons - 1)) * 1.2;
    return vec2(layerX, neuronY);
}

// Weight matrix visualization - realistic weight distributions
float getWeight(int fromLayer, int fromNeuron, int toLayer, int toNeuron, float time) {
    // Use layer and neuron indices to generate consistent weights
    vec2 seed = vec2(
        float(fromLayer * 1000 + fromNeuron),
        float(toLayer * 1000 + toNeuron)
    );
    
    // Xavier/He initialization simulation
    float fanIn = iNeuronDensity * 10.0;
    float variance = 2.0 / fanIn; // He initialization for ReLU
    if (int(iActivationFunction) == 1) {
        variance = 1.0 / fanIn; // Xavier for sigmoid/tanh
    }
    
    float baseWeight = (hash21(seed) - 0.5) * sqrt(variance) * 2.0;
    
    // Weight adaptation through training
    float adaptation = sin(time * iSynapticPlasticity * 2.0 + dot(seed, vec2(1.23, 4.56))) * 0.1;
    
    return (baseWeight + adaptation) * iConnectionStrength;
}

// Forward propagation computation
float forwardPass(vec2 uv, float time) {
    vec2 pos = uv;
    
    // Find closest neuron layer
    float layerProgress = (pos.x + 0.8) / 1.6;
    int currentLayer = int(clamp(layerProgress * iNetworkDepth, 0.0, iNetworkDepth - 1.0));
    
    // Neurons per layer based on density
    int neuronsInLayer = int(clamp(3.0 + iNeuronDensity * 12.0 * iQuality, 3.0, 12.0));
    
    float activation = 0.0;
    float minDist = 1000.0;
    
    // Find closest neuron in current layer
    for (int n = 0; n < 12; n++) {
        if (n >= neuronsInLayer) break;
        
        vec2 neuronPos = getNeuronPosition(currentLayer, n, neuronsInLayer);
        float dist = length(pos - neuronPos);
        
        if (dist < minDist) {
            minDist = dist;
            
            // Compute activation for this neuron
            float netInput = 0.0;
            
            if (currentLayer == 0) {
                // Input layer - use position as driver
                netInput = sin(time * 2.0 + pos.y * 5.0) * 2.0;
            } else {
                // Hidden/output layers - sum weighted inputs from previous layer
                int prevNeurons = int(5.0 + iNeuronDensity * 15.0);
                for (int pn = 0; pn < 20; pn++) {
                    if (pn >= prevNeurons) break;
                    
                    float weight = getWeight(currentLayer - 1, pn, currentLayer, n, time);
                    float prevActivation = sin(time * 3.0 + float(pn) * 0.5) + 0.5;
                    netInput += weight * prevActivation;
                }
                
                // Add bias
                netInput += hash21(vec2(float(currentLayer), float(n))) - 0.5;
            }
            
            // Apply activation function
            activation = activate(netInput, int(iActivationFunction));
            
            // Batch normalization effect
            if (iBatchNormalization > 0.5) {
                activation = (activation - 0.5) * 0.8 + 0.5; // Normalize
            }
            
            // Soft dropout during training to avoid hard blocks
            vec2 dropoutSeed = vec2(float(currentLayer * 100 + n), time * 3.0);
            float dropHash = hash21(dropoutSeed);
            float dropMask = mix(0.4, 1.0, smoothstep(iDropoutRate, iDropoutRate + 0.2, dropHash));
            activation *= mix(1.0, dropMask, step(0.5, iTrainingMode));
        }
    }
    
    // Neuron glow based on activation
    // Ensure a faint baseline glow so the network is visible even at low activation
    float neuronGlow = exp(-minDist * 10.0) * (activation + 0.20);
    
    return neuronGlow;
}

// Backpropagation visualization
    float backwardPass(vec2 uv, float time) {
    vec2 pos = uv;
    
    // Gradient flows from output to input (right to left)
    float gradientTime = time * iGradientFlow * 3.0;
    float wavePosition = fract(gradientTime * 0.3);
    
    // Convert position to gradient flow coordinates
    float gradientProgress = 1.0 - (pos.x + 0.8) / 1.6; // Reverse direction
    
    // Gradient wave propagation
    float gradientWave = exp(-abs(gradientProgress - wavePosition) * 8.0);
    
    // Layer-specific gradient computation
    float layerProgress = (pos.x + 0.8) / 1.6;
    int currentLayer = int(clamp(layerProgress * iNetworkDepth, 0.0, iNetworkDepth - 1.0));
    
    // Compute gradient magnitude (simplified chain rule)
    // Lightweight approximation instead of per-layer accumulation
    float depthSpan = float(int(iNetworkDepth) - currentLayer);
    float layerInput = sin(gradientTime + depthSpan * 1.5);
    float gradient = activateDerivative(layerInput, int(iActivationFunction));
    gradient = pow(abs(gradient), 0.6);
    
    gradient = abs(gradient) * iLearningRate;
    
    return gradientWave * gradient * 0.5;
}

// Synaptic connection visualization
    float synapticConnections(vec2 uv, float time) {
    float connectionIntensity = 0.0;
    int layerCount = int(iNetworkDepth);
    int neurons = int(clamp(3.0 + iNeuronDensity * 12.0 * iQuality, 3.0, 12.0));

    for (int layer = 0; layer < MAX_LAYERS - 1; layer++) {
        if (layer >= layerCount - 1) break;

        // Sample only a few random connections per layer based on iConnSamples
        int maxSamples = 8;
        for (int s = 0; s < 8; s++) {
            if (s >= int(clamp(iConnSamples * 4.0, 1.0, 8.0))) break;

            // Pseudo-random neuron indices
            float sh = hash21(vec2(float(layer * 31 + s), time * 0.5));
            int na = int(floor(sh * float(neurons)));
            int nb = int(floor(fract(sh * 13.7) * float(neurons)));

            vec2 posA = getNeuronPosition(layer, na, neurons);
            vec2 posB = getNeuronPosition(layer + 1, nb, neurons);

            vec2 ap = uv - posA;
            vec2 ab = posB - posA;
            float h = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
            vec2 closest = posA + h * ab;
            float dist = length(uv - closest);

            float weight = abs(getWeight(layer, na, layer + 1, nb, time));
            float connectionViz = exp(-dist * 40.0) * weight;
            float flowTime = time * 3.0 + sh * TAU;
            float flowPulse = 0.6 + 0.4 * sin(flowTime + h * 8.0);
            connectionIntensity += connectionViz * flowPulse;
        }
    }

    return connectionIntensity * 0.12;
}

// Loss landscape visualization
float lossLandscape(vec2 uv, float time) {
    if (iLossLandscape < 0.5) return 0.0;
    
    // Create a loss surface based on weight space
    vec2 weightSpace = uv * 3.0 + time * 0.5;
    
    // Simplified loss function (quadratic bowl with local minima)
    float loss = dot(weightSpace, weightSpace) * 0.3;
    
    // Add local minima/maxima
    loss += sin(weightSpace.x * 4.0) * sin(weightSpace.y * 4.0) * 0.2;
    loss += cos(weightSpace.x * 7.0 + time) * cos(weightSpace.y * 5.0 + time * 1.1) * 0.1;
    
    // Gradient descent path
    vec2 gradientDirection = normalize(weightSpace + 0.1 * vec2(sin(time), cos(time * 1.1)));
    float pathDistance = abs(dot(uv, gradientDirection));
    float path = exp(-pathDistance * 20.0) * iLearningRate;
    
    // Loss contours
    float contour = exp(-abs(fract(loss * 3.0) - 0.5) * 10.0) * 0.3;
    
    return (contour + path) * 0.5;
}

// Neural oscillation patterns (brain waves)
float neuralOscillations(vec2 uv, float time) {
    if (iNeuralOscillation < 0.1) return 0.0;
    
    vec2 pos = uv;
    float oscillation = 0.0;
    
    // Different brain wave frequencies
    float alpha = sin(time * 8.0 + pos.x * 5.0) * 0.3;        // Alpha waves (8-13 Hz)
    float beta = sin(time * 20.0 + pos.y * 8.0) * 0.2;        // Beta waves (13-30 Hz)
    float gamma = sin(time * 40.0 + length(pos) * 15.0) * 0.1; // Gamma waves (30-100 Hz)
    float theta = sin(time * 6.0 + dot(pos, vec2(1.0, 1.0)) * 3.0) * 0.4; // Theta waves (4-8 Hz)
    
    oscillation = alpha + beta + gamma + theta;
    
    // Modulate by network activity
    float networkActivity = forwardPass(uv, time);
    oscillation *= (0.5 + networkActivity * 0.5);
    
    return oscillation * iNeuralOscillation * 0.3;
}

// Color mapping for neural activity
vec3 neuralActivityColor(float activity, float gradient, float time) {
    vec3 baseColor;
    
    if (iTrainingMode > 0.5) {
        // Training mode - show gradients
        baseColor = vec3(1.0, 0.4, 0.2) * gradient;  // Orange for gradients
        baseColor += vec3(0.2, 0.6, 1.0) * activity; // Blue for activations
    } else {
        // Inference mode - show activations
        if (int(iActivationFunction) == 0) {
            baseColor = vec3(0.2, 1.0, 0.6); // Green for ReLU
        } else if (int(iActivationFunction) == 1) {
            baseColor = vec3(1.0, 0.6, 0.2); // Orange for Sigmoid
        } else {
            baseColor = vec3(0.6, 0.2, 1.0); // Purple for Tanh
        }
        // Apply activity with a soft floor so it's never fully dark
        float activityGain = max(0.15, activity);
        baseColor *= activityGain;
    }
    
    // Add some temporal variation
    float timeVar = 0.8 + 0.2 * sin(time * 3.0);
    baseColor *= timeVar;
    
    // Subtle hue breathing
    baseColor *= (0.9 + 0.1 * sin(time * 0.8)) * 1.5;
    return baseColor;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 color = vec3(0.0);
    
    float time = iTime;
    
    // Neural network forward pass
    float neuronActivity = forwardPass(uv, time);
    
    // Backpropagation visualization
    float gradientActivity = 0.0;
    if (iTrainingMode > 0.5) {
        gradientActivity = backwardPass(uv, time);
    }
    
    // Synaptic connections
    float connections = synapticConnections(uv, time);
    
    // Loss landscape
    float loss = lossLandscape(uv, time);
    
    // Neural oscillations
    float oscillations = neuralOscillations(uv, time);
    
    // Combine all effects
    float totalActivity = neuronActivity + connections + loss + oscillations;
    
    // Color mapping
    color = neuralActivityColor(totalActivity, gradientActivity, time);
    
    // Add gradient visualization if in training mode
    if (iTrainingMode > 0.5) {
        vec3 gradientColor = vec3(1.0, 0.3, 0.1) * gradientActivity;
        color = mix(color, color + gradientColor, 0.7);
    }
    
    // Network depth affects overall intensity
    color *= (0.5 + iNetworkDepth / 16.0);
    
    // Add subtle background network grid
    float grid = 0.0;
    vec2 gridUV = uv * 10.0;
    grid += abs(fract(gridUV.x) - 0.5) < 0.05 ? 0.1 : 0.0;
    grid += abs(fract(gridUV.y) - 0.5) < 0.05 ? 0.1 : 0.0;
    color += vec3(0.05, 0.1, 0.15) * grid * iGridIntensity;

    // Fallback: if everything is too dark, add a faint ambient
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color += vec3(0.03) * step(luminance, 0.02);
    
    // Fallback visual if activity is extremely low (safety net)
    if (length(color) < 0.003) {
        vec2 u = uv * 3.0;
        float v = 0.5 + 0.25 * sin(time + u.x) + 0.25 * sin(time * 1.3 + u.y);
        color += mix(vec3(0.18, 0.34, 0.8), vec3(0.9, 0.3, 0.65), v) * 0.6;
    }

    // Boost and apply master intensity
    color *= 2.0 * iMaster;
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`

@Effect({
    author: 'hyperb1iss',
    description:
        'Neural network visualization with real ML mathematics - watch a brain think through cascading light patterns',
    name: 'Neural Synapse Fire',
})
export class NeuralSynapseFireEffect extends WebGLEffect<NeuralSynapseFireControls> {
    protected declare material: THREE.ShaderMaterial

    private readonly activationFunctions = ['ReLU', 'Sigmoid', 'Tanh']

    @NumberControl({
        default: 4,
        label: 'Network Depth',
        max: 8,
        min: 2,
        tooltip: 'Number of neural network layers',
    })
    networkDepth!: number

    @NumberControl({
        default: 30,
        label: 'Learning Rate',
        max: 100,
        min: 1,
        tooltip: 'Training speed - affects gradient flow visualization',
    })
    learningRate!: number

    @ComboboxControl({
        default: 'ReLU',
        label: 'Activation Function',
        tooltip: 'Neural activation function - changes color and behavior',
        values: ['ReLU', 'Sigmoid', 'Tanh'],
    })
    activationFunction!: string

    @NumberControl({
        default: 80,
        label: 'Neuron Density',
        max: 200,
        min: 20,
        tooltip: 'Neurons per layer - more neurons = more connections',
    })
    neuronDensity!: number

    @NumberControl({
        default: 100,
        label: 'Connection Strength',
        max: 200,
        min: 10,
        tooltip: 'Weight matrix visualization intensity',
    })
    connectionStrength!: number

    @BooleanControl({
        default: false,
        label: 'Training Mode',
        tooltip: 'Toggle between forward pass (inference) and backpropagation (training)',
    })
    trainingMode!: boolean

    @NumberControl({
        default: 20,
        label: 'Dropout Rate',
        max: 80,
        min: 0,
        tooltip: 'Neural regularization - randomly dims neurons during training',
    })
    dropoutRate!: number

    @BooleanControl({
        default: true,
        label: 'Batch Normalization',
        tooltip: 'Stabilizes training by normalizing layer inputs',
    })
    batchNormalization!: boolean

    @NumberControl({
        default: 60,
        label: 'Gradient Flow',
        max: 200,
        min: 0,
        tooltip: 'Backpropagation wave intensity - how gradients flow backward',
    })
    gradientFlow!: number

    @BooleanControl({
        default: false,
        label: 'Loss Landscape',
        tooltip: 'Visualize the error surface that the network is optimizing',
    })
    lossLandscape!: boolean

    @NumberControl({
        default: 40,
        label: 'Synaptic Plasticity',
        max: 100,
        min: 0,
        tooltip: 'Connection adaptation speed - how weights change over time',
    })
    synapticPlasticity!: number

    @NumberControl({
        default: 50,
        label: 'Neural Oscillation',
        max: 200,
        min: 0,
        tooltip: 'Brain wave patterns - adds rhythmic neural activity',
    })
    neuralOscillation!: number

    @NumberControl({
        default: 120,
        label: 'Master Intensity',
        max: 200,
        min: 10,
        tooltip: 'Global brightness scaling for the effect',
    })
    masterIntensity!: number

    @NumberControl({
        default: 80,
        label: 'Quality',
        max: 200,
        min: 50,
        tooltip: 'Rendering quality vs performance (50=fast, 200=high detail)',
    })
    quality!: number

    @NumberControl({
        default: 100,
        label: 'Connection Samples',
        max: 200,
        min: 0,
        tooltip: 'How many connections to sample per layer (lower = faster)',
    })
    connSamples!: number

    @NumberControl({
        default: 60,
        label: 'Grid Intensity',
        max: 100,
        min: 0,
        tooltip: 'Background grid visibility',
    })
    gridIntensity!: number

    constructor() {
        super({
            debug: true,
            fragmentShader,
            id: 'neural-synapse-fire',
            name: 'Neural Synapse Fire',
        })
    }

    protected initializeControls(): void {
        const w = window as Record<string, unknown>
        w.networkDepth = 4
        w.learningRate = 30
        w.activationFunction = 'ReLU'
        w.neuronDensity = 80
        w.connectionStrength = 100
        w.trainingMode = false
        w.dropoutRate = 20
        w.batchNormalization = true
        w.gradientFlow = 60
        w.lossLandscape = false
        w.synapticPlasticity = 40
        w.neuralOscillation = 50
        w.masterIntensity = 120
        w.quality = 80
        w.connSamples = 100
        w.gridIntensity = 60
    }

    protected getControlValues(): NeuralSynapseFireControls {
        const w = window as Record<string, unknown>

        const activationIndex = comboboxValueToIndex(
            (w.activationFunction as string | number | undefined) ?? 'ReLU',
            this.activationFunctions,
            0, // Default to ReLU
        )

        return {
            activationFunction: activationIndex,
            batchNormalization: Boolean(boolToInt((w.batchNormalization as number | boolean | undefined) ?? true)),
            connectionStrength: normalizePercentage((w.connectionStrength as number) ?? 100, 100, 0.1) * 2.0,
            connSamples: normalizePercentage((w.connSamples as number) ?? 100, 100, 0.0) * 2.0,
            dropoutRate: normalizePercentage((w.dropoutRate as number) ?? 20, 100, 0.0) * 0.8,
            gradientFlow: normalizePercentage((w.gradientFlow as number) ?? 60, 100, 0.0) * 2.0,
            gridIntensity: normalizePercentage((w.gridIntensity as number) ?? 60, 100, 0.0),
            learningRate: normalizePercentage((w.learningRate as number) ?? 30, 100, 0.01),
            lossLandscape: Boolean(boolToInt((w.lossLandscape as number | boolean | undefined) ?? false)),
            masterIntensity: normalizePercentage((w.masterIntensity as number) ?? 120, 100, 0.1) * 2.0,
            networkDepth: Math.round(2 + ((((w.networkDepth as number) ?? 4) - 2) / 6) * 6), // 2-8 range
            neuralOscillation: normalizePercentage((w.neuralOscillation as number) ?? 50, 100, 0.0) * 2.0,
            neuronDensity: normalizePercentage((w.neuronDensity as number) ?? 80, 100, 0.2) * 2.0,
            quality: normalizePercentage((w.quality as number) ?? 80, 100, 0.5) * 2.0,
            synapticPlasticity: normalizePercentage((w.synapticPlasticity as number) ?? 40, 100, 0.0),
            trainingMode: Boolean(boolToInt((w.trainingMode as number | boolean | undefined) ?? false)),
        }
    }

    protected createUniforms(): Record<string, THREE.IUniform> {
        return {
            iActivationFunction: { value: 0.0 },
            iBatchNormalization: { value: 1.0 },
            iConnectionStrength: { value: 2.0 },
            iConnSamples: { value: 1.0 },
            iDropoutRate: { value: 0.16 },
            iGradientFlow: { value: 1.2 },
            iGridIntensity: { value: 0.6 },
            iLearningRate: { value: 0.3 },
            iLossLandscape: { value: 0.0 },
            iMaster: { value: 1.2 },
            iNetworkDepth: { value: 4.0 },
            iNeuralOscillation: { value: 1.0 },
            iNeuronDensity: { value: 1.6 },
            iQuality: { value: 0.8 },
            iSynapticPlasticity: { value: 0.4 },
            iTrainingMode: { value: 0.0 },
        }
    }

    protected updateUniforms(controls: NeuralSynapseFireControls): void {
        if (!this.material) return

        this.material.uniforms.iNetworkDepth.value = controls.networkDepth
        this.material.uniforms.iLearningRate.value = controls.learningRate
        this.material.uniforms.iActivationFunction.value = controls.activationFunction as number
        this.material.uniforms.iNeuronDensity.value = controls.neuronDensity
        this.material.uniforms.iConnectionStrength.value = controls.connectionStrength
        this.material.uniforms.iTrainingMode.value = controls.trainingMode ? 1.0 : 0.0
        this.material.uniforms.iDropoutRate.value = controls.dropoutRate
        this.material.uniforms.iBatchNormalization.value = controls.batchNormalization ? 1.0 : 0.0
        this.material.uniforms.iGradientFlow.value = controls.gradientFlow
        this.material.uniforms.iLossLandscape.value = controls.lossLandscape ? 1.0 : 0.0
        this.material.uniforms.iSynapticPlasticity.value = controls.synapticPlasticity
        this.material.uniforms.iNeuralOscillation.value = controls.neuralOscillation
        this.material.uniforms.iMaster.value = controls.masterIntensity
        this.material.uniforms.iQuality.value = controls.quality
        this.material.uniforms.iConnSamples.value = controls.connSamples
        this.material.uniforms.iGridIntensity.value = controls.gridIntensity
    }
}

// Create and initialize effect
const effect = new NeuralSynapseFireEffect()
initializeEffect(() => effect.initialize())

export default effect
