import { resolve } from 'node:path'
import swcPlugin from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

import { lightscriptDecoratorsPlugin } from './packages/dev/plugins'

/**
 * Vite config for building the playground as a static SPA
 * This builds the dev UI for deployment to GitHub Pages
 */
export default defineConfig({
    base: '/lightscript-workshop/playground/',

    build: {
        emptyOutDir: true,
        outDir: 'dist-playground',
        rollupOptions: {
            input: resolve(__dirname, 'index.html'),
        },
    },

    define: {
        __DEV__: false,
        __EFFECT_ID__: JSON.stringify('default'),
    },

    plugins: [
        // React SWC with Preact compatibility
        swcPlugin({
            tsDecorators: true,
        }),

        // GLSL shader support
        glsl(),

        // Decorator metadata for controls
        lightscriptDecoratorsPlugin(),
    ],

    resolve: {
        alias: {
            '@lightscript/core': resolve(__dirname, 'packages/core/src'),
            '@lightscript/dev': resolve(__dirname, 'packages/dev/src'),
            react: 'preact/compat',
            'react-dom': 'preact/compat',
        },
    },
})
