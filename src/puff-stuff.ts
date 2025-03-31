import { vec3, vec2, mat3 } from 'gl-matrix';
import { raymarch, DistanceFunction } from './raymarching';
import { tri, rot, N, P } from './glsl-utils';

// Metadata for the effect
export const metadata = {
  title: "Puff Stuff Tunnel",
  controls: [
    { property: "speed", label: "Animation Speed", type: "number", min: 0.1, max: 5, default: 1 },
    { property: "detail", label: "Detail Level", type: "number", min: 1, max: 5, default: 2 },
    { property: "colorShift", label: "Color Shift", type: "boolean", default: 1 }
  ]
};

// Runtime controls
export interface Controls {
  speed: number;
  detail: number;
  colorShift: boolean;
}

// Shader implementation
export class PuffStuffEffect {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private imageData: ImageData;
  private rgb: vec3 = vec3.create();

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.imageData = this.ctx.createImageData(this.width, this.height);
  }

  // Implementation of triSurface from the shader
  private triSurface(p: vec3, time: number): number {
    const scaled = vec3.create();
    const innerTri = vec3.create();
    const pScaled = vec3.create();
    const timeVec = vec3.fromValues(time * 0.15, time * 0.15, time * 0.15);
    
    // p * 0.2
    vec3.scale(pScaled, p, 0.2);
    
    // time + p * 0.05
    vec3.scale(innerTri, p, 0.05);
    vec3.add(innerTri, innerTri, vec3.fromValues(time * 0.05, time * 0.05, time * 0.05));
    
    // tri(time + p * 0.05)
    const innerTriResult = tri(innerTri);
    
    // time + p * 0.25 + tri(time + p * 0.05)
    vec3.scale(scaled, p, 0.25);
    vec3.add(scaled, scaled, timeVec);
    vec3.add(scaled, scaled, innerTriResult);
    
    // tri(time + p * 0.25 + tri(time + p * 0.05))
    const outerTriResult = tri(scaled);
    
    // tri(p) * 0.2
    const baseTriResult = tri(p);
    vec3.scale(baseTriResult, baseTriResult, 0.2);
    
    // tri(time + p * 0.25 + tri(time + p * 0.05)) + tri(p) * 0.2
    vec3.add(outerTriResult, outerTriResult, baseTriResult);
    
    // 1.0 - dot(final, vec3(2.5))
    return 1.0 - vec3.dot(outerTriResult, vec3.fromValues(2.5, 2.5, 2.5));
  }

  // Implementation of map function from the shader
  private map(p: vec3, time: number): number {
    // Calculate base tunnel shape
    const pz = p[2];
    const tunnel = P(pz);
    
    // Distance to tunnel center line
    const dx = p[0] - tunnel[0];
    const dy = p[1] - tunnel[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Alternative distance calculation using p.y - P(p.z).x
    const altDist = p[1] - tunnel[0];
    
    // Take smaller of the two distances
    let s = Math.min(dist, altDist);
    
    // Apply base tunnel size
    s = 1.5 - s;
    
    // Apply ceiling
    s = Math.min(6.5 + p[1], s);
    
    // Apply tri surface deformation
    s -= this.triSurface(p, time);
    
    // Apply noise detail
    for (let a = 0.05; a < 1.0; a += a) {
      // Create scaled and time-animated position
      const noiseP = vec3.create();
      vec3.scale(noiseP, p, a * 40.0);
      vec3.add(noiseP, noiseP, vec3.fromValues(time, time, time));
      
      // Apply sin-based noise
      const sinNoise = vec3.fromValues(
        Math.sin(noiseP[0]),
        Math.sin(noiseP[1]),
        Math.sin(noiseP[2])
      );
      
      // Reduce intensity with distance
      s -= Math.abs(vec3.dot(sinNoise, vec3.fromValues(0.01, 0.01, 0.01))) / a;
    }
    
    // Add color contribution to rgb
    const sinColor = vec3.fromValues(
      Math.sin(p[0]), 
      Math.sin(p[1]), 
      Math.sin(p[2])
    );
    vec3.scale(sinColor, sinColor, 0.15);
    vec3.add(sinColor, sinColor, vec3.fromValues(0.175, 0.175, 0.175));
    vec3.add(this.rgb, this.rgb, sinColor);
    
    return s;
  }

  // Main rendering loop
  render(time: number, controls: Controls) {
    // Scale time by speed
    const t = time * 3.5 * controls.speed;
    
    // Clear rgb accumulator
    vec3.set(this.rgb, 0, 0, 0);
    
    // Set up camera
    const ro = P(t); // Ray origin (camera position)
    const target = P(t + 3); // Look target
    const Z = N(vec3.subtract(vec3.create(), target, ro)); // Forward vector
    
    // Compute camera right vector
    const X = N(vec3.fromValues(Z[2], 0, -Z[0])); // Right vector
    
    // Create view matrix (camera basis)
    const viewMatrix = mat3.fromValues(
      X[0], X[1], X[2],
      vec3.cross(vec3.create(), X, Z)[0], 
      vec3.cross(vec3.create(), X, Z)[1], 
      vec3.cross(vec3.create(), X, Z)[2],
      Z[0], Z[1], Z[2]
    );
    
    // Calculate pixel data
    const data = this.imageData.data;
    
    // Clear data to black
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;     // R
      data[i+1] = 0;   // G
      data[i+2] = 0;   // B
      data[i+3] = 255; // A
    }
    
    // Detail level determines step size for pixels
    const step = 6 - controls.detail; // 1-5 detail maps to 5-1 step size
    
    // March rays for each pixel
    for (let y = 0; y < this.height; y += step) {
      for (let x = 0; x < this.width; x += step) {
        // Reset rgb accumulator for this pixel
        vec3.set(this.rgb, 0, 0, 0);
        
        // Calculate normalized device coordinates (-1 to 1)
        const ndcX = (x - this.width / 2) / this.height;
        const ndcY = (y - this.height / 2) / this.height;
        
        // Apply rotation to ray direction
        const rotation = Math.sin(t * 0.2) * 0.3;
        const rotMatrix = rot(rotation);
        const rotated = vec2.fromValues(
          ndcX * rotMatrix[0] + ndcY * rotMatrix[2],
          ndcX * rotMatrix[1] + ndcY * rotMatrix[3]
        );
        
        // Create ray direction in world space
        const rayDir = vec3.fromValues(rotated[0], rotated[1], 1);
        vec3.transformMat3(rayDir, rayDir, viewMatrix);
        vec3.normalize(rayDir, rayDir);
        
        // Ray marching
        const mapFn: DistanceFunction = (p) => this.map(p, t);
        const dist = raymarch(ro, rayDir, mapFn, 90, 100, 0.001);
        
        // Apply hit point effects
        for (let a = 0.4; a < 4.0; a *= 1.4142) {
          const hitPoint = vec3.create();
          vec3.scaleAndAdd(hitPoint, ro, rayDir, dist);
          
          const sinPoint = vec3.fromValues(
            Math.sin(hitPoint[0] * a * 8),
            Math.sin(hitPoint[1] * a * 8),
            Math.sin(hitPoint[2] * a * 8)
          );
          
          const contribution = Math.abs(vec3.dot(sinPoint, vec3.fromValues(0.07, 0.07, 0.07))) / a;
          vec3.add(this.rgb, this.rgb, vec3.fromValues(contribution, contribution, contribution));
        }
        
        // Apply color
        vec3.multiply(this.rgb, this.rgb, vec3.fromValues(0.3, 0.6, 1.0));
        
        // Apply fog effect based on distance
        const fogFactor = Math.exp(-dist / 2);
        vec3.scale(this.rgb, this.rgb, fogFactor);
        
        // Apply gamma correction
        const r = Math.pow(this.rgb[0], 0.45) * 255;
        const g = Math.pow(this.rgb[1], 0.45) * 255;
        const b = Math.pow(this.rgb[2], 0.45) * 255;
        
        // Set pixel color
        const idx = (y * this.width + x) * 4;
        data[idx] = r;
        data[idx+1] = g;
        data[idx+2] = b;
        data[idx+3] = 255;
        
        // Fill adjacent pixels for low detail
        if (step > 1) {
          for (let sy = 0; sy < step && y+sy < this.height; sy++) {
            for (let sx = 0; sx < step && x+sx < this.width; sx++) {
              if (sx === 0 && sy === 0) continue; // Skip the original pixel
              const fillIdx = ((y+sy) * this.width + (x+sx)) * 4;
              data[fillIdx] = data[idx];
              data[fillIdx+1] = data[idx+1]; 
              data[fillIdx+2] = data[idx+2];
              data[fillIdx+3] = 255;
            }
          }
        }
      }
    }
    
    // Update canvas with calculated pixels
    this.ctx.putImageData(this.imageData, 0, 0);
  }
} 