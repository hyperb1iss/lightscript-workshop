import fs, { readdirSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import { createServer } from 'vite'

interface EffectEntry {
    id: string
    entry: string
}

/**
 * Discover effects from the file system (Node.js version)
 */
function discoverEffects(): EffectEntry[] {
    const effectsDir = resolve(process.cwd(), 'src/effects')
    const effects: EffectEntry[] = []

    for (const item of readdirSync(effectsDir)) {
        const itemPath = resolve(effectsDir, item)
        const stat = statSync(itemPath)

        if (stat.isDirectory()) {
            // Folder-based: effects/{name}/main.ts
            const mainPath = resolve(itemPath, 'main.ts')
            try {
                statSync(mainPath)
                effects.push({ entry: `./effects/${item}/main.ts`, id: item })
            } catch {
                // No main.ts, skip
            }
        } else if (item.endsWith('.ts') && item !== 'index.ts') {
            // Single-file: effects/{name}.ts
            const id = item.replace(/\.ts$/, '')
            effects.push({ entry: `./effects/${item}`, id })
        }
    }

    return effects.sort((a, b) => a.id.localeCompare(b.id))
}

// Discover effects at module load
const effects = discoverEffects()

// Get effect to build from environment variable or default to first effect
const effectToBuild = process.env.EFFECT || effects[0]?.id

/**
 * Logging utility for clean, organized output
 */
const logger = {
    effect: (effectId: string, message: string) => {
        console.log(`[✓] ${message} (${effectId})`)
    },
    error: (message: string) => {
        console.error(`[✗] ${message}`)
    },
}

/**
 * Generate meta tags from control definitions extracted via reflect-metadata
 */
function generateMetaTags(
    effectMetadata: { name: string; description?: string; author?: string; image?: string },
    controls: Array<{
        id: string
        type: string
        label: string
        default: unknown
        tooltip?: string
        min?: number
        max?: number
        values?: string[]
    }>,
): string {
    let metaTags = ''

    // Effect metadata
    metaTags += `<meta name="name" content="${effectMetadata.name}">\n`
    if (effectMetadata.description) {
        metaTags += `<meta name="description" content="${effectMetadata.description}">\n`
    }
    if (effectMetadata.author) {
        metaTags += `<meta name="author" content="${effectMetadata.author}">\n`
    }

    // Control meta tags
    for (const control of controls) {
        const tooltip = control.tooltip ? ` tooltip="${control.tooltip}"` : ''

        switch (control.type) {
            case 'number':
                metaTags += `<meta property="${control.id}" label="${control.label}" type="number" min="${control.min ?? 0}" max="${control.max ?? 100}" default="${control.default}"${tooltip}>\n`
                break
            case 'boolean':
                metaTags += `<meta property="${control.id}" label="${control.label}" type="boolean" default="${control.default}"${tooltip}>\n`
                break
            case 'combobox': {
                const values = (control.values ?? []).join(',')
                metaTags += `<meta property="${control.id}" label="${control.label}" type="combobox" values="${values}" default="${control.default}"${tooltip}>\n`
                break
            }
            case 'hue':
                metaTags += `<meta property="${control.id}" label="${control.label}" type="hue" min="${control.min ?? 0}" max="${control.max ?? 360}" default="${control.default}"${tooltip}>\n`
                break
            case 'color':
                metaTags += `<meta property="${control.id}" label="${control.label}" type="color" default="${control.default}"${tooltip}>\n`
                break
            case 'textfield':
                metaTags += `<meta property="${control.id}" label="${control.label}" type="textfield" default="${control.default}"${tooltip}>\n`
                break
        }
    }

    return metaTags
}

/**
 * Process a single effect (create HTML file from JS)
 */
async function processEffect(effect: EffectEntry) {
    try {
        // Read the compiled output JavaScript
        const jsOutputPath = resolve(process.cwd(), `dist/${effect.id}.js`)
        let jsContent = ''

        if (fs.existsSync(jsOutputPath)) {
            jsContent = fs.readFileSync(jsOutputPath, 'utf-8')
        } else {
            logger.error(`No JS output found for effect: ${effect.id}`)
            jsContent = '// No JS content found'
        }

        let metaTags = ''
        let effectName = effect.id

        // Create a minimal vite server for SSR module loading
        let viteServer: ViteDevServer | null = null
        try {
            // Dynamically import the effect module to extract metadata via reflect-metadata
            // The decorators will execute and store metadata that we can read back
            const modulePath = resolve(process.cwd(), 'src', effect.entry.replace(/^\.\//, ''))

            // Create a vite server instance for SSR loading (allows importing TS files)
            // Use the actual vite config so package aliases work
            viteServer = await createServer({
                configFile: resolve(process.cwd(), 'vite.config.ts'),
                plugins: [], // Don't load our plugin recursively
                server: { middlewareMode: true },
            })

            // Load modules through vite's transform pipeline
            const coreModule = await viteServer.ssrLoadModule('@lightscript/core')
            const { extractControlsFromClass, extractEffectMetadata } = coreModule

            // Import the effect module - this triggers decorator execution
            const effectModule = await viteServer.ssrLoadModule(modulePath)
            const effectInstance = effectModule.default

            if (effectInstance) {
                // Extract metadata using the reflect-metadata system
                const effectMeta = extractEffectMetadata(effectInstance)
                const controls = extractControlsFromClass(effectInstance)

                effectName = effectMeta.name || effect.id

                // Generate meta tags from the extracted metadata
                metaTags = generateMetaTags(effectMeta, controls)

                // Handle image from decorator
                if (effectMeta.image) {
                    const imageValue = effectMeta.image
                    if (
                        imageValue.startsWith('http://') ||
                        imageValue.startsWith('https://') ||
                        imageValue.startsWith('data:')
                    ) {
                        metaTags += `<meta property="image" content="${imageValue}">\n`
                    } else {
                        // Local path relative to effect directory
                        const effectDir = resolve(modulePath, '..')
                        const imagePath = resolve(effectDir, imageValue)
                        if (fs.existsSync(imagePath)) {
                            const ext = extname(imagePath) || '.png'
                            const outPath = resolve(process.cwd(), 'dist', `${effect.id}${ext}`)
                            fs.copyFileSync(imagePath, outPath)
                            metaTags += `<meta property="image" content="${effect.id}${ext}">\n`
                            logger.effect(effect.id, `Preview image attached: ${effect.id}${ext}`)
                        }
                    }
                }

                logger.effect(effect.id, `Extracted ${controls.length} controls via reflect-metadata`)
            } else {
                logger.error(`No default export found for ${effect.id}`)
            }
        } catch (err) {
            logger.error(`Error extracting metadata for ${effect.id}: ${err}`)
        } finally {
            // Clean up vite server
            if (viteServer) {
                await viteServer.close()
            }
        }

        // Auto-discover preview image if not set via decorator
        if (!/property="image"/.test(metaTags)) {
            const sourcePath = effect.entry.replace(/^\.\//, '')
            const candidateNames = [
                'preview.png',
                'preview.jpg',
                'preview.jpeg',
                'cover.png',
                'cover.jpg',
                'cover.jpeg',
                'thumbnail.png',
                'thumbnail.jpg',
                'thumbnail.jpeg',
                `${effect.id}.png`,
                `${effect.id}.jpg`,
                `${effect.id}.jpeg`,
            ]

            const searchDirs = [
                resolve(process.cwd(), 'src', sourcePath.substring(0, sourcePath.lastIndexOf('/'))),
                resolve(process.cwd(), 'public', 'assets', 'effects'),
                resolve(process.cwd(), 'public', 'assets'),
            ]

            let discoveredPath: string | undefined
            for (const dir of searchDirs) {
                for (const name of candidateNames) {
                    const candidate = resolve(dir, name)
                    if (fs.existsSync(candidate)) {
                        discoveredPath = candidate
                        break
                    }
                }
                if (discoveredPath) break
            }

            if (discoveredPath) {
                const ext = extname(discoveredPath) || '.png'
                const outPath = resolve(process.cwd(), 'dist', `${effect.id}${ext}`)
                try {
                    fs.copyFileSync(discoveredPath, outPath)
                    metaTags += `<meta property="image" content="${effect.id}${ext}">\n`
                    logger.effect(effect.id, `Preview image attached: ${effect.id}${ext}`)
                } catch {
                    logger.error(`Failed to copy discovered preview image for ${effect.id}`)
                }
            }
        }

        // Generate the final HTML
        const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="keywords" content="SignalRGB, LightScript, effect">
  <title>${effectName}</title>
  ${metaTags}
</head>
<body>
  <canvas id="exCanvas" width="320" height="200"></canvas>
  <script>
    <!-- BUNDLE_SCRIPT_INJECT -->
  </script>
</body>
</html>`

        const bundleMarker = '<!-- BUNDLE_SCRIPT_INJECT -->'
        const finalHtml = template.replace(bundleMarker, jsContent)

        fs.writeFileSync(resolve(process.cwd(), `dist/${effect.id}.html`), finalHtml)
        logger.effect(effect.id, 'HTML file created successfully')
    } catch (err) {
        logger.error(`Error processing effect ${effect.id}: ${err}`)
    }
}

/**
 * Vite plugin that creates SignalRGB-compatible HTML files
 */
export function signalRGBPlugin(): Plugin {
    return {
        apply: 'build',

        async closeBundle() {
            if (!effectToBuild) {
                logger.error('No effects found in the effects array!')
                return
            }

            const effect = effects.find((e: EffectEntry) => e.id === effectToBuild)
            if (!effect) {
                logger.error(`Effect ${effectToBuild} not found!`)
                return
            }

            await processEffect(effect)
        },
        name: 'signalrgb-plugin',
    }
}
