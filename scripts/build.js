#!/usr/bin/env node

/**
 * Simple build script that builds all effects one by one
 * This avoids the multi-entry point conflict with Rollup
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const NEON_PINK = '\x1b[38;2;255;97;216m'
const NEON_BLUE = '\x1b[38;2;156;158;255m'
const NEON_CYAN = '\x1b[38;2;0;255;255m'
const NEON_GREEN = '\x1b[38;2;0;255;136m'
const NEON_YELLOW = '\x1b[38;2;255;240;0m'
const NEON_PURPLE = '\x1b[38;2;190;110;255m'
const GLITCH = '\x1b[31m\x1b[1m' // Bold red for "glitchy" text
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const _BLINK = '\x1b[5m'
const DIM = '\x1b[2m'

console.log(`\n${NEON_CYAN}
██╗     ██╗ ██████╗ ██╗  ██╗████████╗███████╗ ██████╗██████╗ ██╗██████╗ ████████╗
██║     ██║██╔════╝ ██║  ██║╚══██╔══╝██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝
██║     ██║██║  ███╗███████║   ██║   ███████╗██║     ██████╔╝██║██████╔╝   ██║   
██║     ██║██║   ██║██╔══██║   ██║   ╚════██║██║     ██╔══██╗██║██╔═══╝    ██║   
███████╗██║╚██████╔╝██║  ██║   ██║   ███████║╚██████╗██║  ██║██║██║        ██║   
╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝   
${NEON_PINK}
      ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗███████╗██╗  ██╗ ██████╗ ██████╗ 
      ██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██╔════╝██║  ██║██╔═══██╗██╔══██╗
      ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ███████╗███████║██║   ██║██████╔╝
      ██║███╗██║██║   ██║██╔══██╗██╔═██╗ ╚════██║██╔══██║██║   ██║██╔═══╝ 
      ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗███████║██║  ██║╚██████╔╝██║     
       ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     
`)

// We can't directly import from .ts files in Node.js ESM
// Instead, let's parse the effects array from the source file

function getEffectsList() {
    console.log(`${NEON_BLUE}[⚡]${RESET} ${DIM}Reading effects manifest...${RESET}`)
    try {
        // Read the TypeScript source file
        const source = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf-8')

        // Extract the effects array using a regex pattern
        // This is a simple approach - in a larger project we might want to use a TS parser
        const effectsMatch = source.match(/export const effects = (\[[\s\S]*?\]);/)

        if (!effectsMatch || !effectsMatch[1]) {
            throw new Error('Could not find effects array in src/index.ts')
        }

        // Parse the array without using eval: convert TS literal to JSON-like and JSON.parse
        const arrayLiteral = effectsMatch[1]
        // Remove trailing commas and comments
        const sanitized = arrayLiteral
            .replace(/\/\/.*$/gm, '')
            .replace(/,\s*([\]}])/g, '$1')
            .replace(/(['"])entry\1\s*:\s*(['"])([^'"]+)\2/g, '"entry":"$3"')
            .replace(/(['"])id\1\s*:\s*(['"])([^'"]+)\2/g, '"id":"$3"')
        // Wrap keys to ensure valid JSON
        const jsonReady = sanitized.replace(/(\{|,)\s*(entry|id)\s*:/g, '$1 "$2":')
        /** @type {{id:string,entry:string}[]} */
        const effects = JSON.parse(jsonReady)

        console.log(`${NEON_GREEN}[✓]${RESET} ${BOLD}Effects manifest loaded${RESET}`)
        return effects
    } catch (err) {
        console.error(`${GLITCH}[✘] ERROR: Failed to parse effects${RESET}`, err)
        return []
    }
}

// Get effects list
const effects = getEffectsList()

if (effects.length === 0) {
    console.error(`${GLITCH}[FATAL] No effects found! Check src/index.ts file.${RESET}`)
    process.exit(1)
}

// Ensure the dist directory exists
if (!existsSync('dist')) {
    console.log(`${NEON_CYAN}[⟁]${RESET} Creating distribution matrix...`)
    mkdirSync('dist')
}

// First, compile TypeScript
console.log(`${NEON_PURPLE}[⟁]${RESET} ${BOLD}Transmuting${RESET} TypeScript to JavaScript...`)
execSync('tsc', { stdio: 'inherit' })
console.log(`${NEON_GREEN}[✓]${RESET} ${BOLD}TypeScript${RESET} compilation ${NEON_CYAN}successful${RESET}\n`)

// Build all effects in parallel for faster builds
const total = effects.length
const maxConcurrency = Math.min(4, total) // Limit to 4 parallel builds

console.log(
    `${NEON_PURPLE}[⚡]${RESET} ${BOLD}Building ${total} effects${RESET} with ${maxConcurrency} parallel workers...\n`,
)

const buildEffect = async (effect, index) => {
    const effectId = effect.id
    const counter = index + 1

    try {
        console.log(`${NEON_YELLOW}[⚡]${RESET} Processing effect ${counter}/${total}: ${BOLD}${effectId}${RESET}...`)

        // Use spawn for better parallel execution
        const { spawn } = await import('node:child_process')

        return new Promise((resolve, reject) => {
            const child = spawn('npx', ['vite', 'build'], {
                env: { ...process.env, EFFECT: effectId },
                stdio: ['inherit', 'inherit', 'inherit'],
            })

            child.on('close', (code) => {
                if (code === 0) {
                    console.log(
                        `${NEON_GREEN}[✓]${RESET} ${BOLD}${effectId}${RESET} ${NEON_GREEN}successfully encoded${RESET}`,
                    )
                    resolve(effectId)
                } else {
                    reject(new Error(`Build failed with code ${code}`))
                }
            })
        })
    } catch (error) {
        console.error(`${GLITCH}[✘] BUILD FAILED FOR ${effectId.toUpperCase()}${RESET}`)
        console.error(`${DIM}Error details: ${RESET}`, error)
        throw error
    }
}

// Process effects in batches
const buildInBatches = async () => {
    const results = []
    for (let i = 0; i < effects.length; i += maxConcurrency) {
        const batch = effects.slice(i, i + maxConcurrency)
        const batchPromises = batch.map((effect, idx) => buildEffect(effect, i + idx))

        try {
            const batchResults = await Promise.allSettled(batchPromises)
            results.push(...batchResults)
        } catch (error) {
            console.error(`${GLITCH}[✘] Batch failed:${RESET}`, error)
        }
    }

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    console.log(`\n${NEON_CYAN}[📊] Build Summary:${RESET}`)
    console.log(`${NEON_GREEN}  ✓ Successful: ${successful}${RESET}`)
    if (failed > 0) {
        console.log(`${GLITCH}  ✘ Failed: ${failed}${RESET}`)
    }

    return results
}

await buildInBatches()
