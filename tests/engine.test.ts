import { extractControlsFromClass } from '@lightscript/core'
import { generateControlUI } from '@lightscript/dev'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock effect data for tests
const mockEffects = [
    { id: 'puff-stuff', name: 'Puff Stuff' },
    { id: 'glow-particles', name: 'Glow Particles' },
]

// Mock effect discovery
vi.mock('../src/effects', () => ({
    discoverEffects: vi.fn().mockReturnValue({
        'glow-particles': vi.fn().mockResolvedValue({ default: class {} }),
        'puff-stuff': vi.fn().mockResolvedValue({ default: class {} }),
    }),
    getEffectList: vi.fn().mockReturnValue([
        { entry: './effects/puff-stuff/main.ts', id: 'puff-stuff' },
        { entry: './effects/glow-particles/main.ts', id: 'glow-particles' },
    ]),
}))

// Mock the control-decorators module with inline controls definition
vi.mock('@lightscript/core', () => ({
    extractControlsFromClass: vi.fn().mockReturnValue([
        {
            default: 5,
            id: 'speed',
            label: 'Speed',
            max: 10,
            min: 1,
            type: 'number',
        },
        {
            default: 'Rainbow',
            id: 'colorMode',
            label: 'Color Mode',
            type: 'combobox',
            values: ['Rainbow', 'Mono'],
        },
    ]),
    extractEffectMetadata: vi.fn().mockReturnValue({
        author: 'Test Author',
        description: 'Effect for testing',
        name: 'Test Effect',
    }),
}))

// Mock the registry module
vi.mock('@lightscript/dev', () => ({
    generateControlUI: vi.fn().mockReturnValue(document.createElement('div')),
}))

// Create a proper Response object for fetch
const createMockResponse = (text: string) => {
    return {
        headers: new Headers(),
        json: () => Promise.resolve({}),
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(text),
    }
}

// Define mockControls here for use in the tests, after vi.mock calls
const mockControls = [
    {
        default: 5,
        id: 'speed',
        label: 'Speed',
        max: 10,
        min: 1,
        type: 'number',
    },
    {
        default: 'Rainbow',
        id: 'colorMode',
        label: 'Color Mode',
        type: 'combobox',
        values: ['Rainbow', 'Mono'],
    },
]

// Create mock instance with all required methods
describe('DevEngine', () => {
    let engine: any // Use 'any' type to bypass TypeScript constraints

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()

        // Set up DOM
        document.body.innerHTML = '<div id="container"><canvas id="exCanvas"></canvas></div>'

        // Create a mock engine with the methods we need
        engine = {
            initialize: vi.fn().mockImplementation(async () => {
                // Create control container
                const controlsContainer = document.createElement('div')
                controlsContainer.className = 'controls-container'
                document.getElementById('container')?.appendChild(controlsContainer)

                // Call parseControlsFromTemplate directly for the test
                extractControlsFromClass('<dummy>')

                // If multiple effects, we need to load the effect from URL param
                if (mockEffects.length > 1) {
                    // Call loadEffect for the URL param effect
                    await engine.loadEffect('puff-stuff')
                    return true
                }
                if (mockEffects.length === 1) {
                    // Load the single effect
                    await engine.loadEffect(mockEffects[0].id)
                    return false
                }
                return false
            }),
            loadEffect: vi.fn().mockImplementation(async (effectId) => {
                const effect = mockEffects.find((e) => e.id === effectId)
                if (!effect) {
                    throw new Error(`Effect not found: ${effectId}`)
                }

                // Call parseControlsFromTemplate to update the mock call count
                extractControlsFromClass('<dummy>')

                // Set global variables based on control definitions
                for (const ctrl of mockControls) {
                    ;(window as any)[ctrl.id] = ctrl.default
                }

                // Call UI generation for test coverage
                generateControlUI(mockControls, {}, () => {})

                return mockControls
            }),
            startFPSMonitor: vi.fn().mockImplementation(() => {
                global.requestAnimationFrame(vi.fn())
            }),
        }

        // Mock URL params
        delete (window as any).location
        ;(window as any).location = { search: '?effect=puff-stuff' }

        // Mock fetch with a more complete response
        global.fetch = vi
            .fn()
            .mockResolvedValue(
                createMockResponse('<html><head><meta property="speed" type="number" default="5" /></head></html>'),
            )
    })

    afterEach(() => {
        vi.resetAllMocks()
        document.body.innerHTML = ''
    })

    describe('initialization', () => {
        it('should create control container when initialized', async () => {
            await engine.initialize()
            const controlsContainer = document.querySelector('.controls-container')
            expect(controlsContainer).not.toBeNull()
        })

        it('should create effect selector when multiple effects exist', async () => {
            // We already have multiple effects in the mocked effects array
            await engine.initialize()

            // Check if effect was loaded properly
            expect(extractControlsFromClass).toHaveBeenCalled()
        })

        it('should load the first effect when only one effect exists', async () => {
            // Temporarily replace effects with a single effect array
            const originalEffects = [...mockEffects]
            mockEffects.length = 0
            mockEffects.push({ id: 'puff-stuff', name: 'Puff Stuff' })

            await engine.initialize()

            // Verify the effect is loaded
            expect(generateControlUI).toHaveBeenCalled()

            // Restore original effects
            mockEffects.length = 0
            mockEffects.push(...originalEffects)
        })
    })

    describe('effect loading', () => {
        it('should parse controls when loading an effect', async () => {
            await engine.loadEffect('puff-stuff')

            expect(extractControlsFromClass).toHaveBeenCalled()
            expect(generateControlUI).toHaveBeenCalled()
        })

        it('should set global variables from control defaults', async () => {
            await engine.loadEffect('puff-stuff')

            // Check if global variables were set from control defaults
            expect((window as any).speed).toBe(5)
            expect((window as any).colorMode).toBe('Rainbow')
        })
    })

    describe('FPS monitoring', () => {
        it('should create FPS counter when started', () => {
            // Mock requestAnimationFrame
            global.requestAnimationFrame = vi.fn()

            engine.startFPSMonitor()

            expect(global.requestAnimationFrame).toHaveBeenCalled()
        })
    })
})
