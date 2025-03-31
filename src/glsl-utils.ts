import { vec3, mat2 } from 'gl-matrix';

/**
 * GLSL-like utility functions for shader operations
 */

// Create a rotation matrix equivalent to GLSL's mat2 rotation
export function rot(angle: number): mat2 {
  const m = mat2.create();
  mat2.fromRotation(m, angle);
  return m;
}

// Implementation of the tri function from the shader
export function tri(v: vec3): vec3 {
  const result = vec3.create();
  const floor = vec3.create();
  const half = vec3.fromValues(0.5, 0.5, 0.5);
  
  // floor(v)
  floor[0] = Math.floor(v[0]);
  floor[1] = Math.floor(v[1]);
  floor[2] = Math.floor(v[2]);
  
  // v - floor(v)
  vec3.subtract(result, v, floor);
  
  // (v - floor(v)) - 0.5
  vec3.subtract(result, result, half);
  
  // abs((v - floor(v)) - 0.5)
  result[0] = Math.abs(result[0]);
  result[1] = Math.abs(result[1]);
  result[2] = Math.abs(result[2]);
  
  return result;
}

// GLSL mix function
export function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

// GLSL smoothstep function
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// GLSL step function
export function step(edge: number, x: number): number {
  return x < edge ? 0 : 1;
}

// GLSL clamp function
export function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}

// Helper for tanh calculation used in the shader
export function tanh(x: number): number {
  return Math.tanh(x);
}

// Common normalize function alias (for readability matching the shader)
export function N(v: vec3): vec3 {
  const result = vec3.create();
  vec3.normalize(result, v);
  return result;
}

// P function from the original shader
export function P(z: number): vec3 {
  return vec3.fromValues(
    tanh(Math.cos(z * 0.2) * 0.4) * 12,
    5 + tanh(Math.cos(z * 0.14) * 0.5) * 24,
    z
  );
} 