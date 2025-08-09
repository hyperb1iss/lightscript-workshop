import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ControlDefinition } from '../src/core/controls/definitions'
import { generateControlUI } from '../src/dev/controls-registry'

describe('control registry', () => {
    beforeEach(() => {
        // Set up a clean DOM environment
        document.body.innerHTML = ''
    })

    describe('generateControlUI', () => {
        it('should generate a container element', () => {
            const definitions: ControlDefinition[] = []
            const values = {}
            const onChange = vi.fn()

            const container = generateControlUI(definitions, values, onChange)

            expect(container).toBeInstanceOf(HTMLElement)
            expect(container.classList.contains('controls-container')).toBe(true)
        })

        it('should generate number control elements', () => {
            const definitions: ControlDefinition[] = [
                {
                    default: 5,
                    id: 'speed',
                    label: 'Speed',
                    max: 10,
                    min: 1,
                    type: 'number',
                },
            ]

            const values = { speed: 5 }
            const onChange = vi.fn()

            const container = generateControlUI(definitions, values, onChange)

            // Find the label
            const label = container.querySelector('label')
            expect(label).not.toBeNull()
            expect(label?.textContent).toContain('Speed')

            // Find the slider
            const slider = container.querySelector('input[type="range"]')
            expect(slider).not.toBeNull()
            expect((slider as HTMLInputElement)?.min).toBe('1')
            expect((slider as HTMLInputElement)?.max).toBe('10')
            expect((slider as HTMLInputElement)?.value).toBe('5')
        })

        it('should generate boolean control elements', () => {
            const definitions: ControlDefinition[] = [
                {
                    default: true,
                    id: 'enabled',
                    label: 'Enabled',
                    type: 'boolean',
                },
            ]

            const values = { enabled: true }
            const onChange = vi.fn()

            const container = generateControlUI(definitions, values, onChange)

            // Find the checkbox
            const checkbox = container.querySelector('input[type="checkbox"]')
            expect(checkbox).not.toBeNull()
            expect((checkbox as HTMLInputElement)?.checked).toBe(true)
        })

        it('should generate combobox control elements', () => {
            const definitions: ControlDefinition[] = [
                {
                    default: 'Rainbow',
                    id: 'colorMode',
                    label: 'Color Mode',
                    type: 'combobox',
                    values: ['Rainbow', 'Mono', 'Fire'],
                },
            ]

            const values = { colorMode: 'Rainbow' }
            const onChange = vi.fn()

            const container = generateControlUI(definitions, values, onChange)

            // Find the select element
            const select = container.querySelector('select')
            expect(select).not.toBeNull()

            // Check options
            const options = select?.querySelectorAll('option')
            expect(options?.length).toBe(3)
            expect((options?.[0] as HTMLOptionElement)?.value).toBe('Rainbow')
            expect((options?.[1] as HTMLOptionElement)?.value).toBe('Mono')
            expect((options?.[2] as HTMLOptionElement)?.value).toBe('Fire')

            // Check selected value
            expect((select as HTMLSelectElement)?.value).toBe('Rainbow')
        })

        it('should call onChange when controls are interacted with', () => {
            const definitions: ControlDefinition[] = [
                {
                    default: 5,
                    id: 'speed',
                    label: 'Speed',
                    max: 10,
                    min: 1,
                    type: 'number',
                },
            ]

            const values = { speed: 5 }
            const onChange = vi.fn()

            const container = generateControlUI(definitions, values, onChange)

            // Find the slider
            const slider = container.querySelector('input[type="range"]') as HTMLInputElement

            // Simulate interaction
            slider.value = '7'
            slider.dispatchEvent(new Event('input'))

            // Check if onChange was called
            expect(onChange).toHaveBeenCalledWith('speed', 7)
        })

        it('should handle errors gracefully', () => {
            // Create a definition with issues to trigger an error
            const definitions: ControlDefinition[] = [
                {
                    default: null,
                    id: 'problematic',
                    label: 'Problem Control',
                    type: 'unsupported' as any,
                },
            ]

            const values = {}
            const onChange = vi.fn()

            // This should not throw but create a container with an error message
            const container = generateControlUI(definitions, values, onChange)

            // The container should exist
            expect(container).toBeInstanceOf(HTMLElement)
        })
    })
})
