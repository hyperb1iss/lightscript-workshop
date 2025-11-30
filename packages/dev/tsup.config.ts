import { defineConfig } from 'tsup'

export default defineConfig({
    clean: true,
    dts: true,
    entry: {
        index: 'src/index.ts',
        'plugins/index': 'plugins/index.ts',
    },
    external: ['@lightscript/core', 'vite', 'preact', 'preact/hooks', /^node:/],
    format: ['esm'],
    sourcemap: true,
    treeshake: true,
})
