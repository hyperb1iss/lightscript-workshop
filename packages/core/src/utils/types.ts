/**
 * Common type definitions for LightScript
 */

/**
 * The update function signature used by effects
 */
export type UpdateFunction = (force?: boolean) => void

/**
 * RGB color represented as individual channels
 */
export interface RGBColor {
    r: number
    g: number
    b: number
}

/**
 * HSL color representation
 */
export interface HSLColor {
    h: number
    s: number
    l: number
}
