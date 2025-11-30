import type { Plugin } from 'vite'

function ansiColor(r: number, g: number, b: number): string {
    return `\x1b[38;2;${r};${g};${b}m`
}

const ANSI = {
    bold: '\x1b[1m',
    reset: '\x1b[0m',
}

function printStartupLogo(): void {
    const lines = [
        { rgb: [255, 96, 164] as const, text: '╔──────────────────────────────────────────────────────────╗' },
        { rgb: [255, 170, 64] as const, text: '│   ✨ LightScript Workshop — Radiant by Design, Real‑Time  │' },
        { rgb: [96, 200, 255] as const, text: '│      WebGL · Shaders · Effects · SignalRGB Integration    │' },
        { rgb: [160, 128, 255] as const, text: '╚──────────────────────────────────────────────────────────╝' },
    ]

    const title = 'LIGHTSCRIPT WORKSHOP'
    const subtitle = 'Create dazzling lighting effects. Build boldly. ✨'

    const gradient = [
        [255, 96, 164], // pink
        [255, 170, 64], // amber
        [96, 200, 255], // sky
        [160, 128, 255], // violet
    ] as const

    // Render header box
    for (const line of lines) {
        const [r, g, b] = line.rgb
        // eslint-disable-next-line no-console
        console.log(`${ansiColor(r, g, b)}${line.text}${ANSI.reset}`)
    }

    // Render big title
    const titleColor = ansiColor(...(gradient[0] as unknown as [number, number, number]))
    // eslint-disable-next-line no-console
    console.log(`${ANSI.bold}${titleColor}${title}${ANSI.reset}`)

    // Render subtitle with soft gradient blocks
    const blocks = ['■■■', '■■■', '■■■', '■■■']
    const coloredBlocks = blocks
        .map((b, i) => `${ansiColor(...(gradient[i] as unknown as [number, number, number]))}${b}`)
        .join(`${ANSI.reset} `)
    // eslint-disable-next-line no-console
    console.log(`${coloredBlocks}${ANSI.reset}  ${subtitle}`)

    // Spacer
    // eslint-disable-next-line no-console
    console.log('')
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


