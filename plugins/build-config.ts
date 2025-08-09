import { resolve } from 'path'
import type { BuildOptions } from 'vite'
import { effects } from '../src'

// Environment variables
const noMinify = process.env.NO_MINIFY === 'true'
const effectToBuild = process.env.EFFECT || effects[0]?.id

/**
 * Creates build configuration for a specific effect
 * @returns Build configuration object or undefined if no effect to build
 */
export function getEffectBuildConfig(): BuildOptions | undefined {
    // Find the current effect to build
    const effect = effectToBuild ? effects.find((e) => e.id === effectToBuild) : null

    if (!effect) {
        return undefined
    }

    return {
        emptyOutDir: false, // Don't empty out dir since we're building one effect at a time
        minify: noMinify ? false : ('terser' as const),
        outDir: 'dist',
        rollupOptions: {
            external: [], // Don't treat anything as external
            input: resolve(process.cwd(), 'src', effect.entry.replace(/^\.\//, '')),
            output: {
                entryFileNames: `${effect.id}.js`,
                format: 'iife',
                globals: {},
                inlineDynamicImports: true,
                manualChunks: undefined, // Disable code splitting
            },
        },
        terserOptions: !noMinify
            ? {
                  compress: true,
                  format: {
                      beautify: true, // SignalRGB can't handle minified code
                  },
                  mangle: {
                      keep_classnames: true,
                      keep_fnames: true,
                  },
              }
            : undefined,
    }
}

/**
 * Returns the ID of the effect to build
 */
export function getEffectToBuild() {
    return effectToBuild
}

/**
 * Returns whether minification is disabled
 */
export function isMinifyDisabled() {
    return noMinify
}
