/**
 * @lightscript/core
 *
 * TypeScript API for creating SignalRGB lighting effects.
 * Provides decorators for control definitions, base effect classes,
 * and utilities for WebGL/Canvas rendering.
 *
 * @example
 * ```typescript
 * import {
 *   WebGLEffect,
 *   NumberControl,
 *   BooleanControl,
 *   initializeEffect
 * } from '@lightscript/core'
 *
 * class MyEffect extends WebGLEffect<MyControls> {
 *   @NumberControl({ label: 'Speed', min: 0, max: 10, default: 1 })
 *   speed!: number
 * }
 *
 * initializeEffect(() => new MyEffect({ id: 'my-effect', name: 'My Effect' }).initialize())
 * ```
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────
// Control Decorators
// ─────────────────────────────────────────────────────────────

export type {
    BooleanControlOptions,
    ColorControlOptions,
    ComboboxControlOptions,
    EffectOptions,
    HueControlOptions,
    NumberControlOptions,
    TextFieldControlOptions,
} from './controls/decorators'
export {
    BooleanControl,
    ColorControl,
    ComboboxControl,
    Effect,
    extractControlsFromClass,
    extractEffectMetadata,
    getControlForProperty,
    HueControl,
    METADATA_KEYS,
    NumberControl,
    TextFieldControl,
} from './controls/decorators'

// ─────────────────────────────────────────────────────────────
// Control Helpers
// ─────────────────────────────────────────────────────────────

export type { BaseControls } from './controls/helpers'
export {
    boolToInt,
    comboboxValueToIndex,
    getAllControls,
    getControlValue,
    normalizePercentage,
    normalizeSpeed,
} from './controls/helpers'

// ─────────────────────────────────────────────────────────────
// Control Definitions
// ─────────────────────────────────────────────────────────────

export type {
    BooleanControlDefinition,
    ColorControlDefinition,
    ComboboxControlDefinition,
    ControlDefinition,
    ControlDefinitionType,
    ControlValues,
    HueControlDefinition,
    NumberControlDefinition,
    TextFieldControlDefinition,
} from './controls/definitions'

// ─────────────────────────────────────────────────────────────
// Effect Base Classes
// ─────────────────────────────────────────────────────────────

export type { EffectConfig } from './effects/base-effect'
export { BaseEffect } from './effects/base-effect'
export type { CanvasEffectConfig } from './effects/canvas-effect'
export { CanvasEffect } from './effects/canvas-effect'
export type { WebGLEffectConfig } from './effects/webgl-effect'
export { WebGLEffect } from './effects/webgl-effect'

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

export { createDebugLogger, debug, printStartupBanner } from './utils/debug'
export type { HSLColor, RGBColor, UpdateFunction } from './utils/types'

export type { WebGLContext, WebGLSetupOptions } from './utils/webgl'
export {
    createShaderQuad,
    createStandardUniforms,
    initializeWebGL,
    startAnimationLoop,
} from './utils/webgl'

// ─────────────────────────────────────────────────────────────
// SignalRGB Integration
// ─────────────────────────────────────────────────────────────

/**
 * Initialization mode for effects
 */
export type InitializationMode = 'immediate' | 'deferred' | 'metadata-only'

/**
 * Options for effect initialization
 */
export interface InitOptions {
    /** Initialization mode (default: auto-detect) */
    mode?: InitializationMode
    /** Callback when effect is ready */
    onReady?: () => void
}

/**
 * Detects the current initialization mode based on environment
 */
function detectInitMode(): InitializationMode {
    if (typeof window === 'undefined') {
        return 'metadata-only'
    }
    // Check for build-time metadata extraction
    if ((window as Record<string, unknown>).__LIGHTSCRIPT_METADATA_ONLY__) {
        return 'metadata-only'
    }
    return 'immediate'
}

/**
 * Initialize a SignalRGB effect
 *
 * This function handles the initialization lifecycle for effects,
 * ensuring they start at the right time based on document state
 * and build context.
 *
 * @param initFunction - Function that creates and initializes the effect
 * @param options - Optional initialization configuration
 *
 * @example
 * ```typescript
 * initializeEffect(() => {
 *   const effect = new MyEffect({ id: 'my-effect', name: 'My Effect' })
 *   effect.initialize()
 * })
 * ```
 */
export function initializeEffect(initFunction: () => void, options: InitOptions = {}): void {
    const mode = options.mode ?? detectInitMode()

    // Skip initialization during metadata extraction
    if (mode === 'metadata-only') {
        return
    }

    // Initialize immediately if DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initFunction()
        options.onReady?.()
        return
    }

    // Wait for DOM to be ready
    const handleReady = () => {
        // Double-check mode hasn't changed (e.g., flag set during load)
        if ((window as Record<string, unknown>).__LIGHTSCRIPT_METADATA_ONLY__) {
            return
        }
        initFunction()
        options.onReady?.()
    }

    window.addEventListener('DOMContentLoaded', handleReady, { once: true })

    // Fallback timeout for edge cases
    setTimeout(() => {
        if ((window as Record<string, unknown>).__LIGHTSCRIPT_METADATA_ONLY__) {
            return
        }
        initFunction()
        options.onReady?.()
    }, 1000)
}

// ─────────────────────────────────────────────────────────────
// SignalRGB Window Contract (Type Declarations)
// ─────────────────────────────────────────────────────────────

/**
 * SignalRGB communicates with effects through window properties.
 * This interface documents the contract between effects and SignalRGB.
 */
declare global {
    interface Window {
        /** Called by SignalRGB when any control value changes */
        update?: (force?: boolean) => void

        /** Show a notification in SignalRGB */
        showNotification?: (message: string, isError?: boolean) => void

        /** Active effect instance reference */
        effectInstance?: {
            stop: () => void
        }

        /** Current animation frame ID */
        currentAnimationFrame?: number

        /** Number of registered controls */
        controlsCount?: number

        /** Build-time metadata extraction flag */
        __LIGHTSCRIPT_METADATA_ONLY__?: boolean

        /** Dynamic control values indexed by control ID */
        [controlId: string]: unknown
    }
}
