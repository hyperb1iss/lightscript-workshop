#!/usr/bin/env node

/**
 * Simple build script that builds all effects one by one
 * This avoids the multi-entry point conflict with Rollup
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// SilkCircuit Neon palette
const C = {
    bold: '\x1b[1m',
    cyan: '\x1b[38;2;128;255;234m',
    dim: '\x1b[38;2;100;100;120m',
    green: '\x1b[38;2;80;250;123m',
    purple: '\x1b[38;2;225;53;255m',
    red: '\x1b[38;2;255;99;99m',
    reset: '\x1b[0m',
    yellow: '\x1b[38;2;241;250;140m',
}

// Aliases for existing code
const NEON_BLUE = C.cyan
const NEON_CYAN = C.cyan
const NEON_GREEN = C.green
const NEON_YELLOW = C.yellow
const NEON_PURPLE = C.purple
const GLITCH = `${C.red}${C.bold}`
const RESET = C.reset
const BOLD = C.bold
const DIM = C.dim

function getVersion() {
    try {
        const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
        return pkg.version || '0.0.0'
    } catch {
        return '0.0.0'
    }
}

const version = getVersion()
console.log(`
${C.dim}─────────────────────────────────────────${C.reset}
${C.bold}${C.purple}◈${C.reset} ${C.bold}${C.cyan}LightScript Workshop${C.reset}  ${C.dim}v${version}${C.reset}  ${C.dim}build${C.reset}
${C.dim}─────────────────────────────────────────${C.reset}
`)

import { glob } from 'glob'

/**
 * Discover effects automatically from the file system
 * Patterns:
 *   - src/effects/{name}/main.ts  → folder-based effect
 *   - src/effects/{name}.ts       → single-file effect
 */
async function discoverEffects() {
    console.log(`${NEON_BLUE}[⚡]${RESET} ${DIM}Discovering effects...${RESET}`)

    const effectsDir = resolve(process.cwd(), 'src/effects')
    const effects = []

    // Find folder-based effects: effects/{name}/main.ts
    const folderEffects = await glob('*/main.ts', { cwd: effectsDir })
    for (const path of folderEffects) {
        const id = path.split('/')[0]
        effects.push({ entry: `./effects/${id}/main.ts`, id })
    }

    // Find single-file effects: effects/{name}.ts (exclude index.ts)
    const singleEffects = await glob('*.ts', { cwd: effectsDir })
    for (const file of singleEffects) {
        if (file === 'index.ts') continue
        const id = file.replace(/\.ts$/, '')
        effects.push({ entry: `./effects/${file}`, id })
    }

    console.log(`${NEON_GREEN}[✓]${RESET} ${BOLD}Found ${effects.length} effects${RESET}`)
    return effects
}

// Discover effects from file system
const effects = await discoverEffects()

if (effects.length === 0) {
    console.error(`${GLITCH}[FATAL] No effects found in src/effects/${RESET}`)
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
