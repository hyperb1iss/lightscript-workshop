/**
 * LightScript Vite Plugins
 */

// Export build configuration utilities
export {
    getEffectBuildConfig,
    getEffectToBuild,
    isMinifyDisabled,
} from './build-config'
// Export decorators plugin
export { lightscriptDecoratorsPlugin } from './decorators'
// Export SignalRGB plugin
export { signalRGBPlugin } from './signalrgb'
