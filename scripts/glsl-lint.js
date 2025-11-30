#!/usr/bin/env node

/**
 * GLSL Linting Script for Lightscript Workshop
 *
 * This script provides comprehensive GLSL linting for both:
 * 1. Standalone .glsl files
 * 2. GLSL template literals in TypeScript files
 *
 * Features:
 * - WebGL/OpenGL ES compatibility checking
 * - Syntax validation with custom rules
 * - SignalRGB-specific validations
 * - Detailed error reporting with file locations
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { glob } from 'glob'

// ANSI color codes for better output
const colors = {
    blue: '\x1b[34m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    magenta: '\x1b[35m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
    yellow: '\x1b[33m',
}

class GLSLLinter {
    constructor() {
        this.errors = []
        this.warnings = []
        this.processed = 0
    }

    // Extract GLSL from template literals in TypeScript files
    extractGLSLFromTypeScript(content, filePath) {
        const shaders = []

        // Match template literals that likely contain shaders
        const templateLiteralRegex = /(?:fragmentShader|vertexShader|shader)\s*=\s*`([\s\S]*?)`/g
        const inlineShaderRegex = /const\s+\w*[Ss]hader\s*=\s*`([\s\S]*?)`/g

        // Extract from assignment patterns
        for (const match of content.matchAll(templateLiteralRegex)) {
            const shaderContent = match[1]
            const lineNumber = content.substring(0, match.index).split('\n').length

            shaders.push({
                content: shaderContent.trim(),
                line: lineNumber,
                source: filePath,
                type: 'template_literal',
            })
        }

        // Extract from const declarations
        for (const match of content.matchAll(inlineShaderRegex)) {
            const shaderContent = match[1]
            const lineNumber = content.substring(0, match.index).split('\n').length

            shaders.push({
                content: shaderContent.trim(),
                line: lineNumber,
                source: filePath,
                type: 'const_declaration',
            })
        }

        return shaders
    }

    // Validate GLSL shader content
    validateGLSL(shaderContent, shaderType = 'fragment', source = '', _line = 1) {
        const issues = []
        const lines = shaderContent.split('\n')

        // Basic syntax checks
        if (!shaderContent.includes('precision')) {
            issues.push({
                line: 1,
                message: 'Missing precision qualifier - add "precision highp float;" or similar',
                source,
                type: 'warning',
            })
        }

        // Check for main function
        if (!shaderContent.includes('void main()')) {
            issues.push({
                line: 1,
                message: 'Missing main() function',
                source,
                type: 'error',
            })
        }

        // Check for output in fragment shaders
        if (shaderType === 'fragment' && !shaderContent.includes('gl_FragColor') && !shaderContent.includes('out ')) {
            issues.push({
                line: 1,
                message: 'Fragment shader should output color via gl_FragColor or out variable',
                source,
                type: 'warning',
            })
        }

        // Check version compatibility
        const versionMatch = shaderContent.match(/#version\s+(\d+)/)
        if (versionMatch) {
            const version = Number.parseInt(versionMatch[1], 10)
            if (version > 300) {
                issues.push({
                    line: this.findLineContaining(shaderContent, '#version'),
                    message: `Version ${version} may not be supported on all WebGL contexts`,
                    source,
                    type: 'warning',
                })
            }
        }

        // Check for common WebGL incompatibilities
        if (shaderContent.includes('varying ') && shaderContent.includes('#version 300')) {
            issues.push({
                line: this.findLineContaining(shaderContent, 'varying'),
                message: 'Use "in"/"out" instead of "varying" in GLSL ES 3.00',
                source,
                type: 'error',
            })
        }

        // Check for deprecated functions
        const deprecatedFunctions = [
            { new: 'texture', old: 'texture2D' },
            { new: 'texture', old: 'textureCube' },
            { new: 'textureProj', old: 'texture2DProj' },
            { new: 'texture', old: 'shadow2D' },
            { new: 'texture', old: 'shadow1D' },
        ]

        deprecatedFunctions.forEach(({ old, new: newFunc }) => {
            if (shaderContent.includes(old)) {
                issues.push({
                    line: this.findLineContaining(shaderContent, old),
                    message: `Deprecated function "${old}" - consider using "${newFunc}()" instead`,
                    source,
                    type: 'warning',
                })
            }
        })

        // Check for common typos and issues
        lines.forEach((line, index) => {
            const lineNum = index + 1
            const trimmed = line.trim()

            // Check for missing semicolons (more refined)
            if (
                trimmed.length > 0 &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('#') &&
                !trimmed.startsWith('{') &&
                !trimmed.startsWith('}') &&
                !trimmed.endsWith(';') &&
                !trimmed.endsWith('{') &&
                !trimmed.endsWith('}') &&
                !trimmed.match(/^(if|for|while|else)\s*\(/) &&
                !trimmed.match(/^(uniform|attribute|varying|in|out)\s/) &&
                !trimmed.match(/^\s*(float|vec[234]|mat[234]|int|bool|sampler2D)\s/) &&
                trimmed.includes('=')
            ) {
                issues.push({
                    line: lineNum,
                    message: 'Possible missing semicolon',
                    source,
                    type: 'warning',
                })
            }

            // Check for undefined variables (basic check)
            const variableMatch = trimmed.match(/^\s*(\w+)\s*=/)
            if (variableMatch && !shaderContent.includes(`${variableMatch[1]} `)) {
                issues.push({
                    line: lineNum,
                    message: `Variable "${variableMatch[1]}" may not be declared`,
                    source,
                    type: 'warning',
                })
            }
        })

        // SignalRGB-specific validations
        if (shaderContent.includes('uniform float iTime') && !shaderContent.includes('uniform vec2 iResolution')) {
            issues.push({
                line: this.findLineContaining(shaderContent, 'uniform float iTime'),
                message: 'Consider adding "uniform vec2 iResolution" for aspect ratio handling',
                source,
                type: 'suggestion',
            })
        }

        // Check for performance issues
        if (shaderContent.match(/for\s*\([^}]*\{[^}]*for\s*\(/)) {
            issues.push({
                line: this.findLineContaining(shaderContent, 'for'),
                message: 'Nested loops can cause performance issues on some GPUs',
                source,
                type: 'warning',
            })
        }

        // Check for division by zero risks
        const divisionByZeroMatch = shaderContent.match(/\s\/\s*0\.0(?!\d)/) || shaderContent.match(/\/0\.0(?!\d)/)
        if (divisionByZeroMatch) {
            issues.push({
                line: this.findLineContaining(shaderContent, divisionByZeroMatch[0]),
                message: 'Division by zero detected',
                source,
                type: 'error',
            })
        }

        return issues
    }

    findLineContaining(content, searchText) {
        const lines = content.split('\n')
        const lineIndex = lines.findIndex((line) => line.includes(searchText))
        return lineIndex >= 0 ? lineIndex + 1 : 1
    }

    // Process standalone .glsl files
    async processGLSLFile(filePath) {
        try {
            const content = readFileSync(filePath, 'utf8')
            const fileName = basename(filePath)

            console.log(`${colors.blue}📄 Checking ${fileName}...${colors.reset}`)

            const shaderType = fileName.includes('vertex') || fileName.includes('vert') ? 'vertex' : 'fragment'
            const issues = this.validateGLSL(content, shaderType, filePath)

            issues.forEach((issue) => {
                if (issue.type === 'error') {
                    this.errors.push(issue)
                } else {
                    this.warnings.push(issue)
                }
            })

            this.processed++
        } catch (error) {
            this.errors.push({
                line: 0,
                message: `Failed to read file: ${error.message}`,
                source: filePath,
                type: 'error',
            })
        }
    }

    // Process TypeScript files for embedded GLSL
    async processTypeScriptFile(filePath) {
        try {
            const content = readFileSync(filePath, 'utf8')
            const fileName = basename(filePath)

            const shaders = this.extractGLSLFromTypeScript(content, filePath)

            if (shaders.length > 0) {
                console.log(
                    `${colors.blue}📄 Checking ${fileName} (${shaders.length} shader${shaders.length > 1 ? 's' : ''})...${colors.reset}`,
                )

                shaders.forEach((shader) => {
                    const issues = this.validateGLSL(shader.content, 'fragment', filePath, shader.line)

                    issues.forEach((issue) => {
                        issue.line += shader.line - 1 // Adjust line number to file position

                        if (issue.type === 'error') {
                            this.errors.push(issue)
                        } else {
                            this.warnings.push(issue)
                        }
                    })
                })
            }

            this.processed++
        } catch (error) {
            this.errors.push({
                line: 0,
                message: `Failed to read file: ${error.message}`,
                source: filePath,
                type: 'error',
            })
        }
    }

    // Main linting function
    async lint(patterns = ['src/**/*.glsl', 'src/**/*.ts']) {
        console.log(`${colors.cyan}${colors.bold}🚀 Starting GLSL lint check...${colors.reset}\n`)

        const allFiles = []

        // Collect all files matching patterns
        for (const pattern of patterns) {
            const files = await glob(pattern, { ignore: ['node_modules/**', 'dist/**', 'build/**'] })
            allFiles.push(...files)
        }

        const glslFiles = allFiles.filter((f) => f.endsWith('.glsl'))
        const tsFiles = allFiles.filter((f) => f.endsWith('.ts'))

        console.log(`Found ${glslFiles.length} GLSL files and ${tsFiles.length} TypeScript files to check\n`)

        // Process all files
        for (const file of glslFiles) {
            await this.processGLSLFile(file)
        }

        for (const file of tsFiles) {
            await this.processTypeScriptFile(file)
        }

        this.printResults()
    }

    printResults() {
        console.log(`\n${colors.cyan}${colors.bold}📊 GLSL Lint Results${colors.reset}`)
        console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`)

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log(`${colors.green}${colors.bold}✅ All shaders look good!${colors.reset}`)
            console.log(`${colors.dim}Processed ${this.processed} files${colors.reset}`)
            return
        }

        // Print errors
        if (this.errors.length > 0) {
            console.log(`\n${colors.red}${colors.bold}❌ Errors (${this.errors.length}):${colors.reset}`)
            this.errors.forEach((error, i) => {
                console.log(`${colors.red}${i + 1}. ${colors.reset}${basename(error.source)}:${error.line}`)
                console.log(`   ${colors.red}${error.message}${colors.reset}\n`)
            })
        }

        // Print warnings
        if (this.warnings.length > 0) {
            console.log(`${colors.yellow}${colors.bold}⚠️  Warnings (${this.warnings.length}):${colors.reset}`)
            this.warnings.forEach((warning, i) => {
                console.log(`${colors.yellow}${i + 1}. ${colors.reset}${basename(warning.source)}:${warning.line}`)
                console.log(`   ${colors.yellow}${warning.message}${colors.reset}\n`)
            })
        }

        console.log(`${colors.dim}Processed ${this.processed} files${colors.reset}`)

        // Exit with error code if there are errors
        if (this.errors.length > 0) {
            process.exit(1)
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2)
    const patterns = args.length > 0 ? args : undefined

    const linter = new GLSLLinter()
    await linter.lint(patterns)
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error(`${colors.red}${colors.bold}❌ Unhandled error:${colors.reset}`, error)
    process.exit(1)
})

if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}

export { GLSLLinter }
