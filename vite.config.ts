import { defineConfig } from 'vite';
import type { ConfigEnv } from 'vite';
import glsl from 'vite-plugin-glsl';
import swcPlugin from '@vitejs/plugin-react-swc';

// Import our custom plugins
import { 
  lightscriptDecoratorsPlugin, 
  signalRGBPlugin,
  getEffectBuildConfig 
} from './plugins';

export default defineConfig(({ command }: ConfigEnv) => {
  const isDevelopment = command === 'serve';
  
  return {
    plugins: [
      // React SWC with Preact compatibility - enabling decorator support
      swcPlugin({
        tsDecorators: true
      }),
      
      // SignalRGB HTML generation
      signalRGBPlugin(),
      
      // GLSL shader support
      glsl(),
      
      // Only add lightscript decorators plugin for development mode
      ...(isDevelopment ? [lightscriptDecoratorsPlugin()] : []),
    ],
    resolve: {
      // Add Preact aliases for compatibility
      alias: {
        'react': 'preact/compat',
        'react-dom': 'preact/compat'
      }
    },
    server: {
      port: 3000,
      open: true
    },
    // Build configuration specifically for effects
    build: getEffectBuildConfig()
  };
}); 