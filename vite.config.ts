import swcPlugin from '@vitejs/plugin-react-swc'
import type { ConfigEnv } from 'vite'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

// Import our custom plugins
import { getEffectBuildConfig, lightscriptDecoratorsPlugin, signalRGBPlugin } from './plugins'

export default defineConfig(({ command }: ConfigEnv) => {
    const isDevelopment = command === 'serve'

    return {
        // Build configuration specifically for effects
        build: getEffectBuildConfig(),
        // Enhance development experience
        define: {
            ...(isDevelopment && {
                __DEV__: true,
                __EFFECT_ID__: JSON.stringify(process.env.EFFECT || 'default'),
            }),
        },
        plugins: [
            // React SWC with Preact compatibility - enabling decorator support
            swcPlugin({
                tsDecorators: true,
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
                react: 'preact/compat',
                'react-dom': 'preact/compat',
            },
        },
        server: {
            hmr: {
                // Enable fast refresh for shaders and effects
                overlay: true,
            },
            open: true,
            // Optimize deps for faster cold starts
            optimizeDeps: {
                exclude: ['@vite/client', '@vite/env'],
                include: ['preact', 'preact/compat', 'three'],
            },
            port: 4096,
        },
    }
})
