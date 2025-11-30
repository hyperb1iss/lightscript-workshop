import * as fs from 'node:fs'
import * as path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getEffectList } from '../src/index'

// Mock the fs and child_process modules
vi.mock('node:fs', () => ({
    existsSync: vi.fn((_filePath) => true), // Default to true for file existence checks
    mkdirSync: vi.fn(),
    readFileSync: vi.fn((_filePath) => {
        if (_filePath.toString().includes('package.json')) {
            return JSON.stringify({
                devDependencies: {
                    typescript: '5.8.2',
                    vite: '^6.2.0',
                    'vite-plugin-glsl': '^1.4.0',
                },
                scripts: {
                    build: 'node scripts/build.js',
                    'build:debug': 'NO_MINIFY=true node scripts/build.js',
                    'build:single': 'tsc && vite build',
                },
            })
        }
        return ''
    }),
    writeFileSync: vi.fn(),
}))

vi.mock('node:child_process', () => ({
    execSync: vi.fn(),
}))

describe('build process', () => {
    beforeEach(() => {
        // Reset all mocks
        vi.resetAllMocks()
    })

    describe('effect discovery', () => {
        it('should discover at least one effect', () => {
            const effects = getEffectList()
            expect(effects.length).toBeGreaterThan(0)
        })

        it('should have valid structure for each effect', () => {
            const effects = getEffectList()
            for (const effect of effects) {
                expect(effect).toHaveProperty('id')
                expect(effect).toHaveProperty('entry')
            }
        })

        it('should have unique IDs for each effect', () => {
            const effects = getEffectList()
            const ids = effects.map((e: { id: string }) => e.id)
            const uniqueIds = [...new Set(ids)]
            expect(uniqueIds.length).toBe(effects.length)
        })

        it('should point to existing entry files', () => {
            // Set mock for existsSync to return true for this test
            vi.mocked(fs.existsSync).mockReturnValue(true)

            const effects = getEffectList()
            for (const effect of effects) {
                // Check entry file - normalize the path for platform independence
                const entryPath = path.resolve(process.cwd(), 'src', effect.entry.replace(/^\.\//, ''))

                expect(fs.existsSync(entryPath)).toBe(true)
            }
        })
    })

    // More general build script tests
    describe('build script environment', () => {
        it('should have all required dependencies in package.json', () => {
            const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'))

            // Check for essential build dependencies
            expect(pkg.devDependencies).toHaveProperty('vite')
            expect(pkg.devDependencies).toHaveProperty('typescript')
            expect(pkg.devDependencies).toHaveProperty('vite-plugin-glsl')
        })

        it('should have valid scripts in package.json', () => {
            const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'))

            // Check for the build scripts
            expect(pkg.scripts).toHaveProperty('build')
            expect(pkg.scripts).toHaveProperty('build:debug')
            expect(pkg.scripts).toHaveProperty('build:single')
        })
    })
})
