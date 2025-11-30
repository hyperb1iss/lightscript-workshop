/**
 * Effect discovery via file system conventions
 *
 * Effects are discovered automatically using these patterns:
 * - src/effects/{name}/main.ts  → folder-based effect
 * - src/effects/{name}.ts       → single-file effect
 *
 * The effect ID is derived from the folder/file name.
 * No manual registration needed!
 */

export interface EffectEntry {
    id: string
    entry: string
}

/**
 * Discover effects using Vite's import.meta.glob (dev mode)
 * Returns a map of effect modules keyed by ID
 */
export function discoverEffects(): Record<string, () => Promise<unknown>> {
    // Folder-based: effects/{name}/main.ts
    const folderEffects = import.meta.glob<unknown>('./**/main.ts')

    // Single-file: effects/{name}.ts (exclude this index file)
    const singleEffects = import.meta.glob<unknown>('./*.ts', {
        eager: false,
    })

    const effects: Record<string, () => Promise<unknown>> = {}

    // Process folder-based effects
    for (const [path, loader] of Object.entries(folderEffects)) {
        // ./black-hole/main.ts → black-hole
        const match = path.match(/^\.\/([^/]+)\/main\.ts$/)
        if (match) {
            effects[match[1]] = loader as () => Promise<unknown>
        }
    }

    // Process single-file effects
    for (const [path, loader] of Object.entries(singleEffects)) {
        // ./cellular-automaton.ts → cellular-automaton
        const match = path.match(/^\.\/([^/]+)\.ts$/)
        if (match && match[1] !== 'index') {
            effects[match[1]] = loader as () => Promise<unknown>
        }
    }

    return effects
}

/**
 * Get list of effect entries for build tooling
 */
export function getEffectList(): EffectEntry[] {
    const effects = discoverEffects()
    return Object.keys(effects).map((id) => ({
        entry: `./effects/${id}/main.ts`,
        id,
    }))
}
