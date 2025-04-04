import { resolve } from "path";
import { effects } from "../src";
import type { BuildOptions } from "vite";

// Environment variables
const noMinify = process.env.NO_MINIFY === "true";
const effectToBuild = process.env.EFFECT || effects[0]?.id;

/**
 * Creates build configuration for a specific effect
 * @returns Build configuration object or undefined if no effect to build
 */
export function getEffectBuildConfig(): BuildOptions | undefined {
  // Find the current effect to build
  const effect = effectToBuild
    ? effects.find((e) => e.id === effectToBuild)
    : null;

  if (!effect) {
    return undefined;
  }

  return {
    outDir: "dist",
    emptyOutDir: false, // Don't empty out dir since we're building one effect at a time
    rollupOptions: {
      input: resolve(process.cwd(), "src", effect.entry.replace(/^\.\//, "")),
      output: {
        entryFileNames: `${effect.id}.js`,
        format: "iife",
        inlineDynamicImports: true,
        manualChunks: undefined, // Disable code splitting
        globals: {},
      },
      external: [], // Don't treat anything as external
    },
    minify: noMinify ? false : ("terser" as const),
    terserOptions: !noMinify
      ? {
          compress: true,
          mangle: {
            keep_fnames: true,
            keep_classnames: true,
          },
          format: {
            beautify: true, // SignalRGB can't handle minified code
          },
        }
      : undefined,
  };
}

/**
 * Returns the ID of the effect to build
 */
export function getEffectToBuild() {
  return effectToBuild;
}

/**
 * Returns whether minification is disabled
 */
export function isMinifyDisabled() {
  return noMinify;
}
