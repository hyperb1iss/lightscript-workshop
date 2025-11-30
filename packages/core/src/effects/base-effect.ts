/**
 * BaseEffect - Core class for all SignalRGB effects
 *
 * Provides standardized initialization, control handling, and rendering.
 * Extend this class to create custom effects with any rendering approach.
 *
 * @example
 * ```typescript
 * class MyEffect extends BaseEffect<MyControls> {
 *   protected async initializeRenderer(): Promise<void> {
 *     // Set up your rendering context
 *   }
 *
 *   protected render(time: number): void {
 *     // Render a frame
 *   }
 * }
 * ```
 */

import { createDebugLogger } from '../utils/debug'

/**
 * Configuration for BaseEffect
 */
export interface EffectConfig {
    id: string
    name: string
    debug?: boolean
    canvasWidth?: number
    canvasHeight?: number
}

/**
 * Abstract base class for all effects
 * @template T - The control values type, can be any type with string keys
 */
export abstract class BaseEffect<T> {
    // Core properties
    protected id: string
    protected name: string
    protected debug: ReturnType<typeof createDebugLogger>
    protected animationId: number | null = null
    protected canvasWidth: number
    protected canvasHeight: number
    protected canvas: HTMLCanvasElement | null = null

    // FPS limiting
    private fpsCapLastFrameTime = 0

    /**
     * Create a new BaseEffect
     */
    constructor(config: EffectConfig) {
        this.id = config.id
        this.name = config.name
        this.debug = createDebugLogger(this.name, config.debug ?? false)

        // Canvas dimensions
        this.canvasWidth = config.canvasWidth ?? 320
        this.canvasHeight = config.canvasHeight ?? 200

        // Log initialization
        this.debug('info', 'Effect created', { id: this.id, name: this.name })
    }

    /**
     * Initialize the effect
     * @returns Promise that resolves when initialization is complete
     */
    public async initialize(): Promise<void> {
        this.debug('info', 'Initializing effect...')

        try {
            // Get or create canvas
            this.canvas = document.getElementById('exCanvas') as HTMLCanvasElement
            if (!this.canvas) {
                this.debug('warn', 'Canvas not found, creating one')
                this.canvas = document.createElement('canvas')
                this.canvas.id = 'exCanvas'
                this.canvas.width = this.canvasWidth
                this.canvas.height = this.canvasHeight
                document.body.appendChild(this.canvas)
            }

            // Initialize rendering context (implemented by subclasses)
            await this.initializeRenderer()

            // Initialize controls and register global update function
            this.initializeControls()

            // Make the update function globally available for SignalRGB
            window.update = this.update.bind(this)

            // Start animation loop
            this.startAnimation()

            this.debug('success', 'Effect initialized successfully')
        } catch (error) {
            this.debug('error', 'Initialization failed', error)
            this.handleInitError(error)
        }
    }

    /**
     * Start the animation loop
     */
    protected startAnimation(): void {
        this.debug('info', 'Starting animation loop')
        this.animationId = requestAnimationFrame(this.animationFrame.bind(this))

        // Store animation ID globally for easier management
        window.currentAnimationFrame = this.animationId

        // Store effect instance globally for access by the engine
        window.effectInstance = this
    }

    /**
     * Animation frame function
     * @param timestamp Current timestamp from requestAnimationFrame
     */
    protected animationFrame(timestamp: number): void {
        if (this.animationId === null) return

        // Request next frame first (ensures smooth scheduling)
        this.animationId = requestAnimationFrame(this.animationFrame.bind(this))
        window.currentAnimationFrame = this.animationId

        // Check FPS cap from global setting (set by dev engine)
        const fpsCap = (window as { __lightscriptFpsCap?: number }).__lightscriptFpsCap ?? 0
        if (fpsCap > 0) {
            const frameInterval = 1000 / fpsCap
            if (timestamp - this.fpsCapLastFrameTime < frameInterval) {
                return // Skip this frame
            }
            this.fpsCapLastFrameTime = timestamp
        }

        // Convert to seconds for consistency
        const time = timestamp / 1000

        // Call render method (implemented by subclasses)
        this.render(time)

        // Call onFrame for additional processing
        this.onFrame(time)
    }

    /**
     * Stop the animation loop
     */
    public stop(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
            window.currentAnimationFrame = undefined
            this.debug('info', 'Animation stopped')
        }
    }

    /**
     * Called on every animation frame
     * @param time Current time in seconds
     */
    protected onFrame(time: number): void {
        // Call update occasionally to catch control changes
        if (time % 0.1 < 0.02) {
            this.update()
        }

        // Log occasionally
        if (time % 10 < 0.1) {
            this.debug('debug', 'Animation frame', { time: time.toFixed(2) })
        }
    }

    /**
     * Update effect parameters from controls
     * This is called by SignalRGB when controls change
     */
    public update(force = false): void {
        // Get current control values
        const controls = this.getControlValues()

        // Update parameters
        this.updateParameters(controls)

        // Log control values occasionally
        if (force || Math.random() < 0.01) {
            this.debug('debug', 'Control values updated', controls)
        }
    }

    /**
     * Handle initialization errors
     */
    protected handleInitError(error: unknown): void {
        console.error(`Failed to initialize ${this.name}:`, error)

        // Try to display error message on canvas
        try {
            if (this.canvas) {
                const ctx = this.canvas.getContext('2d')
                if (ctx) {
                    ctx.fillStyle = 'black'
                    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
                    ctx.fillStyle = 'red'
                    ctx.font = '14px Arial'
                    ctx.fillText(`Error initializing ${this.name}`, 20, 50)
                    ctx.fillText(String(error).substring(0, 40), 20, 70)
                }
            }
        } catch (e) {
            console.error('Could not display error message:', e)
        }
    }

    /**
     * Abstract methods that must be implemented by derived classes
     */

    /**
     * Initialize renderer-specific context and resources
     */
    protected abstract initializeRenderer(): Promise<void>

    /**
     * Render a frame
     * @param time Current time in seconds
     */
    protected abstract render(time: number): void

    /**
     * Initialize controls specific to this effect
     */
    protected abstract initializeControls(): void

    /**
     * Get current control values from global scope
     */
    protected abstract getControlValues(): T

    /**
     * Update effect parameters with current control values
     */
    protected abstract updateParameters(controls: T): void
}
