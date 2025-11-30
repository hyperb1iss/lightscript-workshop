import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// SilkCircuit Neon palette
const C = {
    purple: '\x1b[38;2;225;53;255m',
    cyan: '\x1b[38;2;128;255;234m',
    dim: '\x1b[38;2;100;100;120m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
}

function getVersion(): string {
    try {
        const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
        return pkg.version || '0.0.0'
    } catch {
        return '0.0.0'
    }
}

function printStartupLogo(): void {
    const version = getVersion()
    // eslint-disable-next-line no-console
    console.log(`
${C.dim}─────────────────────────────────────────${C.reset}
${C.bold}${C.purple}◈${C.reset} ${C.bold}${C.cyan}LightScript Workshop${C.reset}  ${C.dim}v${version}${C.reset}
${C.dim}─────────────────────────────────────────${C.reset}
`)
}

export function startupLogoPlugin(): Plugin {
    let printed = false
    return {
        apply: 'serve',
        configureServer(server) {
            const doPrint = () => {
                if (printed) return
                printed = true
                printStartupLogo()
            }
            if (server.httpServer && typeof server.httpServer.once === 'function') {
                server.httpServer.once('listening', doPrint)
            } else {
                // Fallback for non-standard environments
                setTimeout(doPrint, 50)
            }
        },
        name: 'lightscript-startup-logo',
    }
}


