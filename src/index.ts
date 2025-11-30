/**
 * LightScript Workshop - Main Entry Point
 *
 * This file exports the core framework components.
 * Effects are auto-discovered from src/effects/ at build/dev time.
 */

// Export all core framework components
export * from './core'

// Re-export effect discovery for convenience
export { discoverEffects, getEffectList } from './effects'
