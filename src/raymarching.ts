import { vec3 } from 'gl-matrix';

// Basic interface for distance functions (SDF)
export interface DistanceFunction {
  (p: vec3): number;
}

/**
 * Ray marching function
 * @param ro Ray origin
 * @param rd Ray direction (normalized)
 * @param map Distance function
 * @param maxSteps Maximum number of steps
 * @param maxDist Maximum distance to march
 * @param epsilon Minimum distance considered a hit
 * @returns Distance marched or maxDist if no hit
 */
export function raymarch(
  ro: vec3,
  rd: vec3,
  map: DistanceFunction,
  maxSteps: number = 100,
  maxDist: number = 50,
  epsilon: number = 0.001
): number {
  let t = 0.1; // Starting distance
  
  for (let i = 0; i < maxSteps; i++) {
    const p = vec3.create();
    vec3.scaleAndAdd(p, ro, rd, t);
    
    const d = map(p);
    
    // Hit something
    if (d < epsilon) {
      return t;
    }
    
    // Advance ray
    t += d * 0.5; // Use distance as step size, with dampening factor
    
    // Went too far, nothing hit
    if (t > maxDist) {
      break;
    }
  }
  
  return maxDist;
}

/**
 * Calculate surface normal at a point using central differences
 * @param p Point on the surface
 * @param map Distance function
 * @param epsilon Small step size
 * @returns Normal vector (normalized)
 */
export function calcNormal(p: vec3, map: DistanceFunction, epsilon: number = 0.001): vec3 {
  const n = vec3.fromValues(
    map(vec3.fromValues(p[0] + epsilon, p[1], p[2])) - map(vec3.fromValues(p[0] - epsilon, p[1], p[2])),
    map(vec3.fromValues(p[0], p[1] + epsilon, p[2])) - map(vec3.fromValues(p[0], p[1] - epsilon, p[2])),
    map(vec3.fromValues(p[0], p[1], p[2] + epsilon)) - map(vec3.fromValues(p[0], p[1], p[2] - epsilon))
  );
  
  return vec3.normalize(n, n);
} 