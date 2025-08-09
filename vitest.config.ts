import { resolve } from 'node:path'
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
            thresholds: {
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70,
                },
            },
        },
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
        // Enable parallel test execution
        maxConcurrency: 4,
        maxThreads: 4,
        minThreads: 1,
        // Fast test feedback
        reporter: ['verbose', 'json'],
        // Skip slow tests in watch mode
        testTimeout: process.env.CI ? 10000 : 5000,
    },
})
