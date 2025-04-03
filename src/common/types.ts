/**
 * Global type definitions for SignalRGB
 */

/**
 * The update function signature used by effects
 */
export type UpdateFunction = (force?: boolean) => void;

/**
 * Extend the Window interface to include SignalRGB global properties
 */
declare global {
  interface Window {
    // The main update function used by effects
    update?: UpdateFunction;

    // Dynamic control properties added at runtime
    [key: string]: unknown;

    // Special SignalRGB properties
    WebGLRenderingContext?: unknown;
  }
}
