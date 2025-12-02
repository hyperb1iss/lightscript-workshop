#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
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

function isWSL() {
    if (os.platform() !== 'linux') return false
    try {
        const release = readFileSync('/proc/version', 'utf8').toLowerCase()
        return release.includes('microsoft') || release.includes('wsl')
    } catch {
        return false
    }
}

function getSignalRGBEffectsDir() {
    const platform = os.platform()
    const home = os.homedir()

    const override = process.env.SIGRGB_DIR
    if (override) return resolve(override)

    // WSL: use Windows home directory from $W env var
    if (isWSL()) {
        const winHome = process.env.W
        if (winHome) {
            const winPath = join(winHome, 'Documents', 'SignalRGB', 'Effects')
            const legacyWinPath = join(winHome, 'Documents', 'WhirlwindFX', 'Effects')
            if (existsSync(legacyWinPath)) return legacyWinPath
            return winPath
        }
        console.log(
            `${yellow}[!]${RESET} WSL detected but $W not set. Set $W to your Windows home dir or use SIGRGB_DIR.`,
        )
    }

    // macOS default location
    const macPath = join(home, 'Documents', 'SignalRGB', 'Effects')
    // Legacy/Windows path
    const winPath = join(home, 'Documents', 'WhirlwindFX', 'Effects')

    if (platform === 'darwin') return macPath
    if (platform === 'win32') {
        if (existsSync(winPath)) return winPath
        return join(home, 'Documents', 'SignalRGB', 'Effects')
    }
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

    console.log(
        `${pink}[⚡]${RESET} ${BOLD}Deploying${RESET} ${files.length} artifact(s) to ${cyan}${targetDir}${RESET}`,
    )
    for (const file of files) {
        const src = join(distDir, file)
        const dst = join(targetDir, file)
        copyFileSync(src, dst)
        console.log(`${green}[✓]${RESET} ${file}`)
    }

    console.log(`${green}[✓]${RESET} Done. Open SignalRGB → Effects to see previews.`)
}

main()
