import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'node:fs';
import type { Plugin } from 'rollup';

// Check if NO_MINIFY environment variable is set
const noMinify = process.env.NO_MINIFY === 'true';

// Custom plugin to create SignalRGB-compatible HTML file
function signalRGBPlugin(): Plugin {
  return {
    name: 'signalrgb-plugin',
    // @ts-expect-error: apply is a valid property for Vite plugins but not in the type definition
    apply: 'build',
    
    // After build is complete
    closeBundle() {
      // Read the template
      const templatePath = resolve(process.cwd(), 'src/template.html');
      const template = fs.readFileSync(templatePath, 'utf-8');
      
      // Read the compiled output JavaScript
      const jsOutputPath = resolve(process.cwd(), 'dist/assets/main.js');
      const jsContent = fs.existsSync(jsOutputPath) 
        ? fs.readFileSync(jsOutputPath, 'utf-8')
        : '// No JS content found';
      
      // Create final HTML with JS content
      const finalHtml = template.replace('{{bundledCode}}', jsContent);
      
      // Write the output file
      fs.writeFileSync(resolve(process.cwd(), 'dist/puff-stuff.html'), finalHtml);
      
      // Also save the raw JS to help debugging
      fs.writeFileSync(resolve(process.cwd(), 'dist/puff-stuff-raw.js'), jsContent);
      
      console.log('SignalRGB HTML file created successfully!');
    }
  };
}

export default defineConfig({
  // Development server
  server: {
    port: 3000,
    open: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'src/main.ts'),
      },
      output: {
        // Ensure the output file has a consistent name
        entryFileNames: 'assets/[name].js',
        format: 'iife', // Use IIFE format for browser compatibility
        compact: false, // Avoid compact output for better readability/compatibility
        globals: {
          three: 'THREE'
        }
      },
      external: [] // Keep three.js in the bundle
    },
    
    // More browser-compatible output
    target: 'es2018', // ES2018 has better browser compatibility
    minify: noMinify ? false : 'terser',
    terserOptions: !noMinify ? {
      // These options aim for maximum compatibility with SignalRGB
      compress: {
        passes: 1,
        drop_console: false, // Keep console logs for debugging
        ecma: 2018,
        keep_fnames: true,
        keep_classnames: true,
        unsafe: false, // Avoid unsafe optimizations
        unsafe_math: false
      },
      mangle: {
        keep_fnames: true,
        keep_classnames: true
      },
      format: {
        comments: false,
        ecma: 2018,
        keep_numbers: true,
        beautify: true,
        indent_level: 1
      },
      ecma: 2018
    } : undefined
  },
  
  plugins: [
    signalRGBPlugin()
  ]
}); 