/**
 * PreactDevEngine - Development framework for effects
 * Provides a UI for controlling and testing effects
 */

import { extractControlsFromClass, extractEffectMetadata } from '@lightscript/core/controls/decorators'
import { ControlDefinition, ControlValues } from '@lightscript/core/controls/definitions'
import { createDebugLogger, printStartupBanner } from '@lightscript/core/utils/debug'
import { h, render } from 'preact'
import { discoverEffects } from '../../../../src/effects'
import { App } from '../ui/components/App'

// Debug helper
const debug = createDebugLogger('PreactEngine')

// Storage key prefix for control values
const STORAGE_KEY_PREFIX = 'lightscript-controls-'

// Discover effects at module load time
const effectModules = discoverEffects()

// Convert to array format for UI
const effects: AppEffect[] = Object.keys(effectModules)
    .sort()
    .map((id) => ({ id, name: id }))

/**
 * Type that matches exactly what the App component expects for effects
 */
type AppEffect = {
    id: string
    name?: string
    description?: string
    author?: string
}

/**
 * Effect metadata extracted from decorators
 */
export interface EffectMetadata {
    name: string
    description: string
    author: string
}

// Window interface is now defined in @lightscript/core

/**
 * Development engine for running and controlling effects
 * using a preact-based UI
 */
export class PreactDevEngine {
    // Current effect data
    private currentEffect: AppEffect | null = null
    private controlDefinitions: ControlDefinition[] = []
    private controlValues: ControlValues = {}

    // DOM elements
    private canvas: HTMLCanvasElement | null = null
    private fpsValue = 0
    private frameCount = 0
    private lastTime = 0

    // Root element for Preact rendering
    private rootElement: HTMLElement | null = null

    private isLoading = true

    // Debounce timer for saving control values
    private saveTimeout: ReturnType<typeof setTimeout> | null = null

    /**
     * Create a new PreactDevEngine instance
     */
    constructor() {
        debug('info', 'Initializing lighting engine')

        // Create root element for Preact
        this.rootElement = document.createElement('div')
        this.rootElement.id = 'preact-root'
        this.rootElement.className = 'dev-engine-container' // Use the same class name as expected by the components
        document.body.appendChild(this.rootElement)

        this.renderUI()

        // Ensure the loader doesn't get stuck: hide on next frame, with timeout as fallback
        requestAnimationFrame(() => {
            this.isLoading = false
            this.renderUI()
        })

        // Fallback: hide the loader after a delay in case the first frame was delayed
        setTimeout(() => {
            if (this.isLoading) {
                this.isLoading = false
                this.renderUI()
            }
        }, 1500)

        // Make the showNotification function available globally
        window.showNotification = this.showNotification.bind(this)
    }

    /**
     * Initialize the development environment
     */
    public async initialize(): Promise<void> {
        // Display startup banner
        printStartupBanner()

        // Create canvas reference
        this.canvas = document.getElementById('exCanvas') as HTMLCanvasElement
        if (!this.canvas) {
            debug('error', 'Canvas element with ID "exCanvas" not found')
            throw new Error('Canvas element with ID "exCanvas" not found')
        }

        // Get the effect ID from URL, localStorage, or use the first effect
        const urlParams = new URLSearchParams(window.location.search)
        const urlEffect = urlParams.get('effect')
        const savedEffect = localStorage.getItem('lastSelectedEffect')
        const effectId = urlEffect || savedEffect || effects[0].id

        // Set basic names for effects to ensure they're visible in UI
        for (const effect of effects as AppEffect[]) {
            if (!effect.name) {
                effect.name = effect.id
            }
        }

        // Update UI immediately with effect names
        this.renderUI()

        // Load the effect
        await this.loadEffect(effectId)

        // Add window resize listener to handle responsive layout
        window.addEventListener('resize', this.handleResize.bind(this))
        this.handleResize()

        // Start FPS monitor
        this.startFPSMonitor()

        debug('success', 'Engine initialized and ready')
    }

    /**
     * Show a notification
     */
    public showNotification(message: string, isError = false): void {
        debug(isError ? 'error' : 'info', `Notification: ${message}`)
        // In the future we can add UI notifications
    }

    /**
     * Save control values to localStorage for persistence
     */
    private saveControlValues(effectId: string): void {
        if (!effectId || Object.keys(this.controlValues).length === 0) return

        try {
            const key = `${STORAGE_KEY_PREFIX}${effectId}`
            localStorage.setItem(key, JSON.stringify(this.controlValues))
            debug('info', `💾 Saved control values for ${effectId}`)
        } catch (err) {
            debug('warn', `Failed to save control values: ${err}`)
        }
    }

    /**
     * Load saved control values from localStorage
     */
    private loadControlValues(effectId: string): Record<string, unknown> | null {
        if (!effectId) return null

        try {
            const key = `${STORAGE_KEY_PREFIX}${effectId}`
            const saved = localStorage.getItem(key)
            if (saved) {
                const values = JSON.parse(saved)
                debug('info', `📂 Loaded saved control values for ${effectId}`)
                return values
            }
        } catch (err) {
            debug('warn', `Failed to load control values: ${err}`)
        }
        return null
    }

    /**
     * Clear saved control values for an effect
     */
    private clearSavedControlValues(effectId: string): void {
        if (!effectId) return

        try {
            const key = `${STORAGE_KEY_PREFIX}${effectId}`
            localStorage.removeItem(key)
            debug('info', `🗑️ Cleared saved control values for ${effectId}`)
        } catch (err) {
            debug('warn', `Failed to clear control values: ${err}`)
        }
    }

    /**
     * Save control values with debounce to avoid excessive writes
     */
    private debouncedSave(effectId: string, delay = 300): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout)
        }
        this.saveTimeout = setTimeout(() => {
            this.saveControlValues(effectId)
            this.saveTimeout = null
        }, delay)
    }

    /**
     * Render the UI using Preact
     */
    private renderUI(): void {
        if (!this.rootElement) return

        render(
            h(App, {
                controlDefinitions: this.controlDefinitions,
                controlValues: this.controlValues,
                currentEffectId: this.currentEffect?.id || '',
                effects: effects as AppEffect[],
                fps: this.fpsValue,
                isLoading: this.isLoading,
                onControlChange: (id: string, value: unknown) => this.handleControlChange(id, value),
                onEffectChange: (id: string) => this.loadEffect(id),
                onResetControls: () => this.resetControls(),
                onSavePreview: () => this.savePreview(),
            }),
            this.rootElement,
        )
    }

    /**
     * Handle window resize events
     */
    private handleResize(): void {
        if (this.canvas) {
            // Make canvas responsive within container
            const canvasContainer = this.canvas.parentElement
            if (canvasContainer) {
                const maxWidth = Math.min(window.innerWidth - 40, 1200)
                const maxHeight = window.innerHeight - 40
                const aspectRatio = this.canvas.width / this.canvas.height

                let width: number
                let height: number

                if (maxWidth / aspectRatio <= maxHeight) {
                    width = maxWidth
                    height = maxWidth / aspectRatio
                } else {
                    height = maxHeight
                    width = height * aspectRatio
                }

                this.canvas.style.width = `${width}px`
                this.canvas.style.height = `${height}px`
            }
        }
    }

    /**
     * Load an effect by its ID
     */
    public async loadEffect(effectId: string): Promise<void> {
        debug('info', `Loading effect: ${effectId}`)

        // Find the effect loader
        const loadEffect = effectModules[effectId]
        if (!loadEffect) {
            debug('error', `Effect not found: ${effectId}`)
            return
        }

        // Find or create the effect entry for UI
        let effect = effects.find((e) => e.id === effectId)
        if (!effect) {
            effect = { id: effectId, name: effectId }
            effects.push(effect)
        }

        // Save the selected effect to localStorage
        localStorage.setItem('lastSelectedEffect', effectId)

        // Update current effect reference
        this.currentEffect = effect

        // Stop any existing animation and clean up
        this.cleanupCurrentEffect()

        // Reset controls
        this.controlDefinitions = []
        this.controlValues = {}

        try {
            debug('info', `Loading effect module: ${effectId}`)

            // Load the effect module using Vite's glob loader
            const effectModule = (await loadEffect()) as { default?: unknown }

            if (!effectModule || !effectModule.default) {
                throw new Error(`Effect module ${effectId} has no default export`)
            }

            // Extract metadata from the effect class using the decorator system
            this.extractMetadata(effect, effectModule.default)

            // Extract controls from the effect class using the decorator system
            this.extractControls(effectModule.default)

            // Update UI with the current effect and controls
            this.renderUI()

            debug('success', `Effect ${effectId} loaded and ready`)
        } catch (error) {
            debug('error', `Failed to load effect ${effectId}:`, error)
            this.showNotification(`Failed to load effect: ${error}`, true)
        }
    }

    /**
     * Extract metadata from an effect class
     */
    private extractMetadata(effect: AppEffect, effectClass: unknown): void {
        try {
            // Use the imported decorator functions directly
            const metadata = extractEffectMetadata(effectClass)
            if (metadata) {
                debug('success', `Found metadata for ${effect.id}: ${metadata.name}`)
                effect.name = metadata.name
                effect.description = metadata.description
                effect.author = metadata.author

                // Update the UI with the new metadata
                this.renderUI()
            }
        } catch (err) {
            debug('warn', `Error extracting metadata: ${err}`)
        }
    }

    /**
     * Extract controls from an effect class
     */
    private extractControls(effectClassOrInstance: unknown): void {
        debug('info', 'Extracting controls from effect')

        try {
            // Use the imported decorator functions directly
            const controls = extractControlsFromClass(effectClassOrInstance)

            if (controls && controls.length > 0) {
                debug('success', `Found ${controls.length} controls using decorators`)

                // Filter out any huge string values that might be shader code
                const filteredControls = controls.filter((control: ControlDefinition) => {
                    // Skip controls with huge string values (like shader code)
                    if (control.type === 'textfield') {
                        const defaultValue = String(control.default || '')
                        // If the string is very long, it's probably not a real control
                        if (defaultValue.length > 500) {
                            debug('warn', `Skipping likely shader code control: ${control.id}`)
                            return false
                        }
                    }
                    return true
                })

                // Log all controls for debugging
                debug('info', 'Control definitions:', filteredControls)

                this.controlDefinitions = filteredControls

                // Initialize control values
                this.controlValues = {}
                for (const control of filteredControls) {
                    // Make sure we're using the correct default values
                    if (control.type === 'number' || control.type === 'hue') {
                        // Make sure number value is within defined range
                        const typedControl = control as Record<string, unknown>
                        const min = typedControl.min ? Number(typedControl.min) : 0
                        const max = typedControl.max ? Number(typedControl.max) : 100
                        const defaultValue = Number(control.default)
                        // Ensure the value is within the allowed range
                        const safeValue = Math.max(min, Math.min(max, defaultValue))
                        this.controlValues[control.id] = safeValue
                        window[control.id] = safeValue
                    } else if (control.type === 'boolean') {
                        // Convert possible 0/1 values to actual booleans
                        const defaultValue = control.default === 1 ? true : Boolean(control.default)
                        this.controlValues[control.id] = defaultValue
                        window[control.id] = defaultValue
                    } else {
                        this.controlValues[control.id] = control.default
                        window[control.id] = control.default
                    }

                    debug('info', `Initialized control: ${control.id} = ${window[control.id]}`)
                }

                // Load saved values if they exist (overrides defaults)
                if (this.currentEffect?.id) {
                    const savedValues = this.loadControlValues(this.currentEffect.id)
                    if (savedValues) {
                        for (const control of filteredControls) {
                            if (control.id in savedValues) {
                                const savedValue = savedValues[control.id]
                                // Validate saved value matches control type
                                if (control.type === 'number' || control.type === 'hue') {
                                    const typedControl = control as Record<string, unknown>
                                    const min = typedControl.min ? Number(typedControl.min) : 0
                                    const max = typedControl.max ? Number(typedControl.max) : 100
                                    const numValue = Number(savedValue)
                                    if (!Number.isNaN(numValue)) {
                                        const safeValue = Math.max(min, Math.min(max, numValue))
                                        this.controlValues[control.id] = safeValue
                                        window[control.id] = safeValue
                                        debug('info', `🔄 Restored: ${control.id} = ${safeValue}`)
                                    }
                                } else if (control.type === 'boolean') {
                                    const boolValue = savedValue === 1 ? true : Boolean(savedValue)
                                    this.controlValues[control.id] = boolValue
                                    window[control.id] = boolValue
                                    debug('info', `🔄 Restored: ${control.id} = ${boolValue}`)
                                } else {
                                    this.controlValues[control.id] = savedValue
                                    window[control.id] = savedValue
                                    debug('info', `🔄 Restored: ${control.id} = ${savedValue}`)
                                }
                            }
                        }

                        // Trigger effect update after restoring values
                        // Poll for window.update to be available (effects may take time to init)
                        const triggerUpdate = (attempts = 0) => {
                            if (typeof window.update === 'function') {
                                try {
                                    window.update(true)
                                    debug('info', '🔄 Triggered effect update after restore')
                                } catch (err) {
                                    debug('warn', 'Error triggering update after restore:', err)
                                }
                            } else if (attempts < 10) {
                                // Retry up to 10 times with 50ms delay
                                setTimeout(() => triggerUpdate(attempts + 1), 50)
                            }
                        }
                        requestAnimationFrame(() => triggerUpdate())
                    }
                }

                // Update the UI with the controls
                this.renderUI()
            } else {
                debug('warn', 'No controls found using decorators')
                this.controlDefinitions = []
                this.controlValues = {}
                this.renderUI()
            }
        } catch (err) {
            debug('error', 'Error extracting controls:', err)
            this.controlDefinitions = []
            this.controlValues = {}
            this.renderUI()
        }
    }

    /**
     * Clean up the current effect and its resources
     */
    private cleanupCurrentEffect(): void {
        // Stop the effect's animation if it has a stop method
        if (window.effectInstance && typeof window.effectInstance.stop === 'function') {
            debug('info', 'Stopping current effect')
            try {
                window.effectInstance.stop()
            } catch (err) {
                debug('warn', 'Error stopping effect:', err)
            }
        }

        // Cancel any animation frames
        if (window.currentAnimationFrame) {
            debug('info', 'Cancelling animation frame')
            cancelAnimationFrame(window.currentAnimationFrame)
            window.currentAnimationFrame = undefined
        }

        // Clear global variables to prevent conflicts
        this.clearGlobalVariables()

        // Clear current effect instance
        window.effectInstance = undefined

        // Need to recreate canvas to ensure clean WebGL context
        if (this.canvas) {
            const parent = this.canvas.parentElement
            const canvasId = this.canvas.id
            const width = this.canvas.width
            const height = this.canvas.height

            // Remove old canvas
            if (parent) {
                parent.removeChild(this.canvas)

                // Create new canvas
                const newCanvas = document.createElement('canvas')
                newCanvas.id = canvasId
                newCanvas.width = width
                newCanvas.height = height
                parent.appendChild(newCanvas)

                // Update reference
                this.canvas = newCanvas
            }
        }
    }

    /**
     * Handle control value changes
     */
    private handleControlChange(id: string, value: unknown): void {
        debug('info', `Control changed: ${id} = ${value}`)

        // Update internal state
        this.controlValues[id] = value

        // Update global variable
        window[id] = value

        // Update the UI
        this.renderUI()

        // Try to call the global update function if it exists
        if (typeof window.update === 'function') {
            try {
                window.update()
            } catch (error) {
                debug('error', 'Error calling update:', error)
            }
        }

        // Save control values with debounce
        if (this.currentEffect?.id) {
            this.debouncedSave(this.currentEffect.id)
        }
    }

    /**
     * Clear global variables used by effects
     */
    private clearGlobalVariables(): void {
        // Clear control variables
        if (this.controlDefinitions.length > 0) {
            for (const def of this.controlDefinitions) {
                delete window[def.id]
            }
        }

        // Clear global effect instance and animation reference
        window.effectInstance = undefined
        window.currentAnimationFrame = undefined

        // Delete the update function
        delete window.update
    }

    /**
     * Start monitoring FPS
     */
    public startFPSMonitor(): void {
        const performanceNow =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? () => performance.now()
                : () => Date.now()

        this.lastTime = performanceNow()

        const updateFPS = () => {
            const now = performanceNow()
            this.frameCount++

            // Update every second
            if (now - this.lastTime >= 1000) {
                this.fpsValue = Math.round((this.frameCount * 1000) / (now - this.lastTime))

                // Update UI with new FPS value
                this.renderUI()

                this.frameCount = 0
                this.lastTime = now
            }

            requestAnimationFrame(updateFPS)
        }

        requestAnimationFrame(updateFPS)
    }

    // takeScreenshot removed in favor of savePreview-only action

    /**
     * Save a 1024x1024 preview image derived from the current canvas
     */
    private savePreview(): void {
        if (!this.canvas) return

        try {
            // Force an immediate update for freshest frame
            if (typeof window.update === 'function') {
                window.update()
            }

            const src = this.canvas
            const srcWidth = src.width
            const srcHeight = src.height

            // Create offscreen target canvas 1024x1024
            const targetSize = 1024
            const off = document.createElement('canvas')
            off.width = targetSize
            off.height = targetSize
            const ctx = off.getContext('2d')
            if (!ctx) throw new Error('2D context unavailable')

            // Fill with transparent background
            ctx.clearRect(0, 0, off.width, off.height)

            // Fit source into square, preserving aspect and centered
            const srcAspect = srcWidth / srcHeight
            const dstAspect = 1 // square
            let drawWidth: number
            let drawHeight: number

            if (srcAspect > dstAspect) {
                // Wider than tall → match width
                drawWidth = targetSize
                drawHeight = Math.round(targetSize / srcAspect)
            } else {
                // Taller than wide → match height
                drawHeight = targetSize
                drawWidth = Math.round(targetSize * srcAspect)
            }

            const dx = Math.floor((targetSize - drawWidth) / 2)
            const dy = Math.floor((targetSize - drawHeight) / 2)
            ctx.drawImage(src, 0, 0, srcWidth, srcHeight, dx, dy, drawWidth, drawHeight)

            // Compose filename
            const effectId = this.currentEffect?.id || 'effect'
            const link = document.createElement('a')
            link.download = `${effectId}.png`
            link.href = off.toDataURL('image/png')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            this.showNotification('Preview saved as 1024×1024 PNG')
            debug('success', 'Preview image saved (1024x1024)')
        } catch (err) {
            debug('error', 'Failed to save preview:', err)
            this.showNotification('Failed to save preview!', true)
        }
    }

    /**
     * Reset all controls to their default values
     */
    private resetControls(): void {
        // Check if we should ask for confirmation
        const shouldConfirm = confirm('Reset all controls to default values?')
        if (!shouldConfirm) return

        debug('info', 'Resetting all controls to default values')

        // Clear saved values for this effect
        if (this.currentEffect?.id) {
            this.clearSavedControlValues(this.currentEffect.id)
        }

        // Reset all controls to default values
        for (const def of this.controlDefinitions) {
            // Update internal state
            this.controlValues[def.id] = def.default

            // Update global variable
            window[def.id] = def.default
        }

        // Update the UI
        this.renderUI()

        // Call the global update function
        if (typeof window.update === 'function') {
            window.update(true)
        }

        debug('success', 'All controls reset to default values')
        this.showNotification('Controls reset to default values')
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        debug('info', 'Shutting down engine')

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this))

        // Clean up current effect
        this.cleanupCurrentEffect()

        // Clear UI
        if (this.rootElement) {
            render(null, this.rootElement)
            if (this.rootElement.parentNode) {
                this.rootElement.parentNode.removeChild(this.rootElement)
            }
        }

        debug('success', 'Engine shut down successfully')
    }
}
