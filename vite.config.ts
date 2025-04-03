import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'node:fs';
import type { Plugin } from 'vite';
import { effects } from './src';
import glsl from 'vite-plugin-glsl';

// Check if NO_MINIFY environment variable is set
const noMinify = process.env.NO_MINIFY === 'true';

// Get effect to build from environment variable or default to first effect
const effectToBuild = process.env.EFFECT || effects[0]?.id;

// Custom plugin to create SignalRGB-compatible HTML files
function signalRGBPlugin(): Plugin {
  return {
    name: 'signalrgb-plugin',
    apply: 'build',
    
    // After build is complete
    closeBundle() {
      if (!effectToBuild) {
        console.error('No effects found in the effects array!');
        return;
      }
      
      const effect = effects.find(e => e.id === effectToBuild);
      if (!effect) {
        console.error(`Effect ${effectToBuild} not found!`);
        return;
      }
      
      processEffect(effect);
    }
  };
}

// Process a single effect (create HTML file from template + JS)
function processEffect(effect: typeof effects[0]) {
  try {
    // Strip leading ./ from paths if needed
    const templatePath = effect.template.replace(/^\.\//, '');
    
    // Read the template
    const templateFullPath = resolve(process.cwd(), 'src', templatePath);
    
    // Read the compiled output JavaScript
    const jsOutputPath = resolve(process.cwd(), `dist/${effect.id}.js`);
    let jsContent;
    
    if (fs.existsSync(jsOutputPath)) {
      jsContent = fs.readFileSync(jsOutputPath, 'utf-8');
      console.log(`Found JS output for ${effect.id}`);
    } else {
      console.error(`No JS output found for effect: ${effect.id}`);
      jsContent = '// No JS content found';
    }
    
    // Use a simple HTML comment replacement strategy
    const template = fs.readFileSync(templateFullPath, 'utf-8');
    
    // Replace the bundle marker comment with the actual script content
    const bundleMarker = '<!-- BUNDLE_SCRIPT_INJECT -->';
    const finalHtml = template.replace(bundleMarker, jsContent);
    
    // Write the output files
    fs.writeFileSync(resolve(process.cwd(), `dist/${effect.id}.html`), finalHtml);
    
    console.log(`SignalRGB HTML file created successfully for: ${effect.id}`);
  } catch (err) {
    console.error(`Error processing effect ${effect.id}:`, err);
  }
}

export default defineConfig(({ mode }) => {
  if (!effectToBuild) {
    console.error('No effects found in the effects array!');
    return {};
  }
  
  const effect = effects.find(e => e.id === effectToBuild);
  if (!effect) {
    console.error(`Effect ${effectToBuild} not found!`);
    return {};
  }
  
  return {
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false, // Don't empty out dir since we're building one at a time
      rollupOptions: {
        input: resolve(process.cwd(), 'src', effect.entry.replace(/^\.\//, '')),
        output: {
          format: 'iife',
          entryFileNames: `${effect.id}.js`,
          inlineDynamicImports: true, // Now we can use this since we only have one input
          globals: {
            three: 'THREE'
          }
        },
        external: []
      },
      target: 'es2018',
      minify: noMinify ? false : 'terser',
      terserOptions: !noMinify ? {
        compress: true,
        mangle: {
          keep_fnames: true,
          keep_classnames: true
        },
        format: {
          beautify: true
        }
      } : undefined
    },
    plugins: [
      glsl(),
      signalRGBPlugin()
    ]
  };
}); 