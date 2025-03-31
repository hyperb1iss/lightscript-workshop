import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'node:fs';
import type { Plugin, OutputChunk } from 'rollup';

// Custom plugin to bundle JS and inject into HTML template
function lightscriptsPlugin(): Plugin {
  return {
    name: 'lightscripts-plugin',
    // For Vite 'build' is a valid apply value
    // @ts-ignore
    apply: 'build',
    
    // After bundle is generated, create lightscripts HTML file
    generateBundle(options, bundle) {
      // Find main chunk
      const mainChunk = Object.values(bundle).find(
        (chunk): chunk is OutputChunk => chunk.type === 'chunk' && 'isEntry' in chunk && chunk.isEntry
      );
      
      if (!mainChunk) return;
      
      // Read template
      const templatePath = resolve(process.cwd(), 'src/template.html');
      const template = fs.readFileSync(templatePath, 'utf-8');
      
      // Replace placeholder with bundled code
      const html = template.replace('{{bundledCode}}', mainChunk.code);
      
      // Add to output as a new asset
      this.emitFile({
        type: 'asset',
        fileName: 'puff-stuff.html',
        source: html
      });
      
      // Clean up the original JS file since we don't need it
      delete bundle[mainChunk.fileName];
    }
  };
}

export default defineConfig({
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    host: true
  },
  
  // Metadata for better dev experience
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src')
    }
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // In build mode, we're targeting the main.ts entry point
        main: resolve(process.cwd(), 'src/main.ts'),
      },
    },
    // Recommended settings for small bundles
    target: 'es2018',
    minify: 'terser',
    terserOptions: {
      compress: {
        // Optimize for size
        passes: 2,
        drop_console: true,
      }
    }
  },
  plugins: [
    lightscriptsPlugin()
  ]
}); 