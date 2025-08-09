import { describe, expect, it } from 'vitest'
import {
    BooleanControl,
    ComboboxControl,
    Effect,
    extractControlsFromClass,
    extractEffectMetadata,
    NumberControl,
} from '../src/core/controls/decorators'
import { ControlDefinition } from '../src/core/controls/definitions'

// Note: We're testing the decorator API directly
describe('control-decorators', () => {
    describe('extractControlsFromClass', () => {
        it('should extract control definitions from decorated class properties', () => {
            // Create a test class with decorators
            @Effect({
                author: 'Test Author',
                description: 'Effect for testing',
                name: 'Test Effect',
            })
            class TestEffect {
                @NumberControl({
                    default: 5,
                    label: 'Speed',
                    max: 10,
                    min: 1,
                    tooltip: 'Controls speed',
                })
                speed!: number

                @BooleanControl({
                    default: true,
                    label: 'Toggle Feature',
                    tooltip: 'Enables a feature',
                })
                enabled!: boolean

                @ComboboxControl({
                    default: 'Red',
                    label: 'Color Mode',
                    tooltip: 'Select color mode',
                    values: ['Red', 'Green', 'Blue'],
                })
                colorMode!: string
            }

            // Extract controls
            const controls = extractControlsFromClass(TestEffect)

            // Validate results
            expect(controls).toHaveLength(3)

            // Find specific controls
            const speedControl = controls.find((c: ControlDefinition) => c.id === 'speed')
            const enabledControl = controls.find((c: ControlDefinition) => c.id === 'enabled')
            const colorModeControl = controls.find((c: ControlDefinition) => c.id === 'colorMode')

            // Verify individual controls
            expect(speedControl).toMatchObject({
                default: 5,
                id: 'speed',
                label: 'Speed',
                max: 10,
                min: 1,
                tooltip: 'Controls speed',
                type: 'number',
            })

            expect(enabledControl).toMatchObject({
                default: true,
                id: 'enabled',
                label: 'Toggle Feature',
                tooltip: 'Enables a feature',
                type: 'boolean',
            })

            expect(colorModeControl).toMatchObject({
                default: 'Red',
                id: 'colorMode',
                label: 'Color Mode',
                tooltip: 'Select color mode',
                type: 'combobox',
                values: ['Red', 'Green', 'Blue'],
            })
        })
    })

    describe('extractEffectMetadata', () => {
        it('should extract metadata from class decorator', () => {
            // Create a test class with Effect decorator
            @Effect({
                author: 'Cool Author',
                description: 'A cool effect',
                name: 'Cool Effect',
            })
            class CoolEffect {}

            // Extract metadata
            const metadata = extractEffectMetadata(CoolEffect)

            // Verify metadata
            expect(metadata).toMatchObject({
                author: 'Cool Author',
                description: 'A cool effect',
                name: 'Cool Effect',
            })
        })

        it('should return default values if no metadata found', () => {
            // Class without decorator
            class PlainClass {}

            // Extract metadata
            const metadata = extractEffectMetadata(PlainClass)

            // Verify default metadata
            expect(metadata).toMatchObject({
                author: '',
                description: '',
                name: 'Unnamed Effect',
            })
        })
    })
})
