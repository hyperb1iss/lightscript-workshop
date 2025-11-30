#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import os from 'node:os'
import { join, resolve } from 'node:path'

const NEON = (c) => `\x1b[38;2;${c}m`
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const cyan = NEON('0,255,255')
const green = NEON('0,255,136')
const pink = NEON('255,97,216')
const yellow = NEON('255,240,0')
const red = '\x1b[31m'

function getSignalRGBEffectsDir() {
    const platform = os.platform()
    const home = os.homedir()
    // macOS default location
    const macPath = join(home, 'Documents', 'SignalRGB', 'Effects')
    // Legacy/Windows path for reference (user can set SIGRGB_DIR to override)
    const winPath = join(home, 'Documents', 'WhirlwindFX', 'Effects')

    const override = process.env.SIGRGB_DIR
    if (override) return resolve(override)

    if (platform === 'darwin') return macPath
    // Fallback
    if (existsSync(winPath)) return winPath
    return macPath
}

function main() {
    const distDir = resolve(process.cwd(), 'dist')
    const targetDir = getSignalRGBEffectsDir()

    if (!existsSync(distDir)) {
        console.error(`${red}[✘]${RESET} dist/ not found. Build first with ${BOLD}npm run build${RESET}.`)
        process.exit(1)
    }

    if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true })
        console.log(`${cyan}[⟁]${RESET} Created Effects directory at ${targetDir}`)
    }

    const files = readdirSync(distDir).filter((f) => /\.(html|png|jpg|jpeg)$/i.test(f))
    if (files.length === 0) {
        console.log(`${yellow}[!]${RESET} No SignalRGB artifacts found in dist/`)
        process.exit(0)
    }

    console.log(`${pink}[⚡]${RESET} ${BOLD}Deploying${RESET} ${files.length} artifact(s) to SignalRGB Effects...`)
    for (const file of files) {
        const src = join(distDir, file)
        const dst = join(targetDir, file)
        copyFileSync(src, dst)
        console.log(`${green}[✓]${RESET} ${file}`)
    }

    console.log(`${green}[✓]${RESET} Done. Open SignalRGB → Effects to see previews.`)
}

main()
