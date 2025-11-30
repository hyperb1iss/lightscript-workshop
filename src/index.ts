/**
 * LightScript Workshop - Main Entry Point
 *
 * This file re-exports from the @lightscript packages for convenience.
 * Effects are auto-discovered from src/effects/ at build/dev time.
 */

// Re-export everything from core package
export * from '@lightscript/core'

// Re-export effect discovery for convenience
export { discoverEffects, getEffectList } from './effects'
