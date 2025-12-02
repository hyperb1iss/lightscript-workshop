import { resolve } from 'node:path'
import swcPlugin from '@vitejs/plugin-react-swc'
import type { ConfigEnv } from 'vite'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

// Import our custom plugins from the dev package
import {
    getEffectBuildConfig,
    lightscriptDecoratorsPlugin,
    signalRGBPlugin,
    startupLogoPlugin,
} from './packages/dev/plugins'

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

            // Only add lightscript plugins for development mode
            ...(isDevelopment ? [lightscriptDecoratorsPlugin(), startupLogoPlugin()] : []),
        ],

        resolve: {
            alias: {
                // Package aliases - resolve to local source during development
                '@lightscript/core': resolve(__dirname, 'packages/core/src'),
                '@lightscript/dev': resolve(__dirname, 'packages/dev/src'),

                // Preact compatibility
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
            optimizeDeps: {
                exclude: ['@vite/client', '@vite/env'],
                include: ['preact', 'preact/compat', 'three', 'reflect-metadata'],
            },
            port: 4096,
        },
    }
})
