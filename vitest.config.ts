import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    test: {
        coverage: {
            exclude: ['node_modules/', 'dist/', 'scripts/'],
            reporter: ['text', 'json', 'html'],
        },
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts'],
    },
})
