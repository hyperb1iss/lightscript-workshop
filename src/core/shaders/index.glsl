/**
 * LightScript Shared GLSL Library
 *
 * This file provides all shared utilities in one include.
 * For selective imports, use the individual files:
 *   - color.glsl   - Color space conversions and utilities
 *   - palette.glsl - 16-mode color palette system
 *   - noise.glsl   - Hash, noise, FBM, and domain warping
 *
 * Usage in your shader:
 *   #include "../core/shaders/index.glsl"
 *
 * Or selectively:
 *   #include "../core/shaders/palette.glsl"
 */

#include "./color.glsl"
#include "./palette.glsl"
#include "./noise.glsl"
