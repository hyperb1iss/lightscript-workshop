#!/usr/bin/env node

/**
 * Combines VitePress docs and Playground builds for GitHub Pages deployment
 *
 * Output structure:
 *   dist-pages/
 *   ├── index.html          (docs home)
 *   ├── getting-started/
 *   ├── reference/
 *   ├── playground/          (the app)
 *   │   ├── index.html
 *   │   └── assets/
 *   └── ...
 */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DOCS_DIST = resolve(ROOT, 'docs/.vitepress/dist')
const PLAYGROUND_DIST = resolve(ROOT, 'dist-playground')
const OUTPUT = resolve(ROOT, 'dist-pages')

console.log('\n✨ Combining docs + playground for GitHub Pages\n')

// Validate source directories exist
if (!existsSync(DOCS_DIST)) {
    console.error('❌ Docs build not found. Run `pnpm docs:build` first.')
    process.exit(1)
}

if (!existsSync(PLAYGROUND_DIST)) {
    console.error('❌ Playground build not found. Run `pnpm playground:build` first.')
    process.exit(1)
}

// Clean output directory
if (existsSync(OUTPUT)) {
    console.log('🧹 Cleaning existing dist-pages...')
    rmSync(OUTPUT, { recursive: true })
}

mkdirSync(OUTPUT, { recursive: true })

// Copy docs (the main site)
console.log('📚 Copying docs...')
cpSync(DOCS_DIST, OUTPUT, { recursive: true })

// Copy playground into subdirectory
console.log('🎮 Copying playground...')
const playgroundOutput = resolve(OUTPUT, 'playground')
mkdirSync(playgroundOutput, { recursive: true })
cpSync(PLAYGROUND_DIST, playgroundOutput, { recursive: true })

// Ensure .nojekyll exists (prevents GitHub Pages from ignoring _files)
writeFileSync(resolve(OUTPUT, '.nojekyll'), '')
console.log('📄 Created .nojekyll')

console.log('\n✅ Combined build complete!')
console.log(`   Output: ${OUTPUT}\n`)
console.log('📁 Structure:')
console.log('   dist-pages/')
console.log('   ├── index.html (docs)')
console.log('   ├── getting-started/')
console.log('   ├── reference/')
console.log('   ├── playground/')
console.log('   │   └── index.html (app)')
console.log('   └── ...\n')
