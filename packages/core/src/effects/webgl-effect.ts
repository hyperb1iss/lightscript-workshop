/**
 * WebGLEffect - Base class for WebGL-based SignalRGB effects
 * Extends BaseEffect with WebGL/Three.js specific implementation
 */

import * as THREE from 'three'
import { AudioData, createAudioUniforms, getAudioData, updateAudioUniforms } from '../utils/audio'
import { createShaderQuad, createStandardUniforms, initializeWebGL, WebGLContext } from '../utils/webgl'
import { BaseEffect, EffectConfig } from './base-effect'

/**
 * Configuration for WebGLEffect
 */
export interface WebGLEffectConfig extends EffectConfig {
    fragmentShader: string
    vertexShader?: string
    /**
     * Enable audio reactive uniforms (iAudioLevel, iAudioBass, etc.)
     * When true, audio uniforms are automatically created and updated each frame
     */
    audioReactive?: boolean
}

/**
 * Base class for WebGL-based effects using Three.js
 * @template T - The control values type
 */
export abstract class WebGLEffect<T> extends BaseEffect<T> {
    // WebGL specific properties
    protected webGLContext: WebGLContext | null = null
    protected material: THREE.ShaderMaterial | null = null
    protected customUniforms: Record<string, THREE.IUniform> = {}
    protected fragmentShader: string
    protected vertexShader?: string

    // Audio reactive properties
    protected audioReactive: boolean
    protected audioUniforms: Record<string, THREE.IUniform> = {}
    protected currentAudioData: AudioData | null = null

    /**
     * Create a new WebGLEffect
     */
    constructor(config: WebGLEffectConfig) {
        super(config)

        // Store shaders
        this.fragmentShader = config.fragmentShader
        this.vertexShader = config.vertexShader
        this.audioReactive = config.audioReactive ?? false

        this.debug('info', 'WebGLEffect created', {
            audioReactive: this.audioReactive,
        })
    }

    /**
     * Initialize WebGL renderer and resources
     */
    protected async initializeRenderer(): Promise<void> {
        this.debug('info', 'Initializing WebGL renderer')

        if (!this.canvas) {
            throw new Error('Canvas not available for WebGL initialization')
        }

        // Initialize WebGL context
        this.webGLContext = initializeWebGL({
            canvasHeight: this.canvasHeight,
            canvasId: this.canvas.id,
            canvasWidth: this.canvasWidth,
        })

        const { scene } = this.webGLContext

        // Create uniforms
        const standardUniforms = createStandardUniforms(this.canvas)
        this.customUniforms = this.createUniforms()

        // Create audio uniforms if audio reactive
        if (this.audioReactive) {
            this.audioUniforms = createAudioUniforms()
            this.debug('info', 'Audio uniforms created')
        }

        const uniforms = {
            ...standardUniforms,
            ...this.customUniforms,
            ...this.audioUniforms,
        }

        // Create shader quad
        const { mesh, material } = createShaderQuad(this.fragmentShader, uniforms, this.vertexShader)

        // Store material for updates
        this.material = material

        // Add mesh to scene
        scene.add(mesh)

        this.debug('success', 'WebGL renderer initialized', {
            audioReactive: this.audioReactive,
        })
    }

    /**
     * Render a frame with WebGL
     */
    protected render(time: number): void {
        if (!this.webGLContext || !this.material) {
            return
        }

        // Update time uniform
        if (this.material.uniforms.iTime) {
            this.material.uniforms.iTime.value = time
        }

        // Update audio uniforms if audio reactive
        if (this.audioReactive) {
            this.currentAudioData = getAudioData()
            updateAudioUniforms(this.material.uniforms, this.currentAudioData)
        }

        // Render the scene
        const { renderer, scene, camera } = this.webGLContext
        renderer.render(scene, camera)
    }

    /**
     * Get current audio data (available when audioReactive is true)
     * Useful for effects that want to access audio data in updateUniforms
     */
    protected getAudio(): AudioData | null {
        return this.currentAudioData
    }

    /**
     * Update effect parameters from controls
     * This is called by the base class update method
     */
    protected updateParameters(controls: T): void {
        if (!this.material) {
            this.debug('warn', 'Material not initialized yet in updateParameters()')
            return
        }

        // Update shader uniforms
        this.updateUniforms(controls)
    }

    /**
     * Create custom uniforms for this effect
     */
    protected abstract createUniforms(): Record<string, THREE.IUniform>

    /**
     * Update shader uniforms with current control values
     */
    protected abstract updateUniforms(controls: T): void
}
