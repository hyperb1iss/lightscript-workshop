import { FunctionComponent } from 'preact'
import { useMemo, useState } from 'preact/hooks'

type DocsMap = Record<string, string>

// Load markdown files as raw strings using Vite's glob import
const rawDocs = import.meta.glob('/docs/*.{md,MD}', { as: 'raw', eager: true }) as DocsMap

interface DocItem {
    path: string
    name: string
    content: string
}

function toTitle(filename: string): string {
    const base = filename.replace(/\.[^/.]+$/, '')
    return base
        .replace(/^\d+[-_\s]*/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

function extractNameFromPath(path: string): string {
    const parts = path.split('/')
    const file = parts[parts.length - 1]
    return toTitle(file)
}

// Simple syntax highlighting for common languages
function highlightCode(code: string, lang: string): string {
    // Basic keyword highlighting based on language
    const keywords: Record<string, string[]> = {
        javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export', 'from', 'async', 'await', 'new', 'this'],
        typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export', 'from', 'async', 'await', 'new', 'this', 'interface', 'type', 'enum', 'implements'],
        glsl: ['vec2', 'vec3', 'vec4', 'float', 'int', 'bool', 'void', 'uniform', 'varying', 'attribute', 'if', 'else', 'for', 'while', 'return', 'in', 'out', 'inout', 'sampler2D', 'texture2D', 'gl_Position', 'gl_FragCoord', 'gl_FragColor'],
    }
    
    let highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    
    const langKeywords = keywords[lang] || keywords.javascript
    
    // Highlight strings
    highlighted = highlighted.replace(
        /(["'])(?:(?=(\\?))\2.)*?\1/g,
        '<span style="color: #B5FF71;">$&</span>'
    )
    
    // Highlight numbers
    highlighted = highlighted.replace(
        /\b(\d+\.?\d*)\b/g,
        '<span style="color: #FFB571;">$&</span>'
    )
    
    // Highlight comments
    highlighted = highlighted.replace(
        /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        '<span style="color: #666; font-style: italic;">$&</span>'
    )
    
    // Highlight keywords
    langKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'g')
        highlighted = highlighted.replace(
            regex,
            '<span style="color: #FF71CE; font-weight: bold;">$1</span>'
        )
    })
    
    // Highlight functions
    highlighted = highlighted.replace(
        /\b([a-zA-Z_]\w*)\s*(?=\()/g,
        '<span style="color: #01CDFE;">$1</span>'
    )
    
    return highlighted
}

// Minimal markdown to HTML renderer for our docs
function renderMarkdown(md: string): string {
    let html = md

    // Process code blocks first to prevent escaping their content
    const codeBlocks: string[] = []
    
    // Code fences with language ```lang
    html = html.replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        (_m, lang, code) => {
            const highlighted = highlightCode(code.trim(), lang || 'javascript')
            const block = `<pre class="md-code" data-lang="${lang || 'text'}"><code>${highlighted}</code></pre>`
            codeBlocks.push(block)
            return `__CODE_BLOCK_${codeBlocks.length - 1}__`
        }
    )

    // Escape HTML
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, (_m, code) => `<code class="md-inline-code">${code}</code>`)

    // Headings ###### to #
    for (let level = 6; level >= 1; level--) {
        const pattern = new RegExp(`^${'#'.repeat(level)}\\s+(.+)$`, 'gm')
        html = html.replace(pattern, (_m, text) => `<h${level}>${text}</h${level}>`)
    }

    // Bold and italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

    // Ordered lists
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ol>${m}</ol>`) // wrap consecutive li as ol

    // Unordered lists
    html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => (m.includes('<ol>') ? m : `<ul>${m}</ul>`))

    // Paragraphs (lines that are not already block-level)
    html = html.replace(/^(?!<h\d|<ul>|<ol>|<li>|<pre>|<\/|__CODE_BLOCK_|\s*$)(.+)$/gm, '<p>$1</p>')

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
        html = html.replace(`__CODE_BLOCK_${i}__`, block)
    })

    return html
}

export const DocsBrowser: FunctionComponent = () => {
    const docs: DocItem[] = useMemo(() => {
        const entries = Object.entries(rawDocs).map(([path, content]) => ({
            content,
            name: extractNameFromPath(path),
            path,
        }))
        return entries.sort((a, b) => a.name.localeCompare(b.name))
    }, [])

    const [query, setQuery] = useState('')
    const [selectedPath, setSelectedPath] = useState(docs[0]?.path || '')

    const filtered = useMemo(() => {
        if (!query.trim()) return docs
        const q = query.toLowerCase()
        return docs.filter((d) => d.name.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
    }, [docs, query])

    const selected = useMemo(() => {
        return docs.find((d) => d.path === selectedPath) || filtered[0] || docs[0]
    }, [docs, filtered, selectedPath])

    return (
        <div className="docs-panel">
            <div className="docs-toolbar">
                <input
                    autoFocus={true}
                    className="docs-search"
                    onInput={(e: any) => setQuery(e.currentTarget.value)}
                    placeholder="Search docs..."
                    value={query}
                />
                <select
                    className="docs-select"
                    onChange={(e: any) => setSelectedPath(e.currentTarget.value)}
                    value={selected?.path}
                >
                    {filtered.map((d) => (
                        <option key={d.path} value={d.path}>
                            {d.name}
                        </option>
                    ))}
                </select>
            </div>

            <div
                className="docs-content"
                dangerouslySetInnerHTML={{ __html: selected ? renderMarkdown(selected.content) : '' }}
            />
        </div>
    )
}
