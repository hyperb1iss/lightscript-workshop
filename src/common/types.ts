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
    update: UpdateFunction;

    // Control count for UI display
    controlsCount: number;

    // Dynamic control properties added at runtime
    [key: string]: unknown;

    // Special SignalRGB properties
    WebGLRenderingContext?: unknown;

    // Function to show notifications in the UI
    showNotification: (message: string, isError?: boolean) => void;
  }
}

export {};
