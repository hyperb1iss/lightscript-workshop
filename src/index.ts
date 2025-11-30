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
    {
        entry: './effects/black-hole/main.ts',
        id: 'black-hole',
    },
    {
        entry: './effects/voronoi-flow/main.ts',
        id: 'voronoi-flow',
    },
    {
        entry: './effects/quantum-foam/main.ts',
        id: 'quantum-foam',
    },
    {
        entry: './effects/adhd-hyperfocus/main.ts',
        id: 'adhd-hyperfocus',
    },
    {
        entry: './effects/neural-synapse-fire.ts',
        id: 'neural-synapse-fire',
    },
    {
        entry: './effects/reality-exe-error/main.ts',
        id: 'reality-exe-error',
    },
    {
        entry: './effects/cellular-automaton.ts',
        id: 'cellular-automaton',
    },
    {
        entry: './effects/temporal-hallucination/main.ts',
        id: 'temporal-hallucination',
    },
]
