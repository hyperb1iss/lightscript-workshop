/**
 * Main entry point for the LightScript framework
 * This file exports the core framework and effect registry
 */

// Export all core framework components
export * from './core'

// Available effects with paths for discovery and loading
export const effects = [
    {
        entry: './effects/puff-stuff/main.ts',
        id: 'puff-stuff',
    },
    {
        entry: './effects/simple-wave/main.ts',
        id: 'simple-wave',
    },
    {
        entry: './effects/glow-particles/main.ts',
        id: 'glow-particles',
    },
    {
        entry: './effects/cyber-descent/main.ts',
        id: 'cyber-descent',
    },
    {
        entry: './effects/kaleido-tunnel/main.ts',
        id: 'kaleido-tunnel',
    },
]
