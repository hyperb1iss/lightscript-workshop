import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';
import { effects } from './src';
import glsl from 'vite-plugin-glsl';

// Check if NO_MINIFY environment variable is set
const noMinify = process.env.NO_MINIFY === 'true';

// Get effect to build from environment variable or build all
const effectToBuild = process.env.EFFECT;
// Flag to know if we're handling a recursive build
const isRecursiveBuild = process.env.RECURSIVE_BUILD === 'true';

// Custom plugin to create SignalRGB-compatible HTML files
function signalRGBPlugin(): Plugin {
  return {
    name: 'signalrgb-plugin',
    apply: 'build',
    
    // After build is complete
    closeBundle() {
      // Handle only current effect in recursive builds
      if (isRecursiveBuild) {
        const currentEffect = effects.find(e => e.id === effectToBuild);
        if (!currentEffect) {
          console.error(`Effect ${effectToBuild} not found!`);
          return;
        }
        processEffect(currentEffect);
        return;
      }
      
      // For normal builds, process the appropriate effects
      const effectsToProcess = effectToBuild
        ? [effects.find(e => e.id === effectToBuild)!]
        : effects; // Process all effects in main build
        
      if (effectToBuild && !effects.find(e => e.id === effectToBuild)) {
        console.error(`Effect ${effectToBuild} not found!`);
        return;
      }
      
      effectsToProcess.forEach(processEffect);
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
    const template = fs.readFileSync(templateFullPath, 'utf-8');
    
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
    
    // Create final HTML with JS content
    const finalHtml = template.replace('{{bundledCode}}', jsContent);
    
    // Write the output files
    fs.writeFileSync(resolve(process.cwd(), `dist/${effect.id}.html`), finalHtml);
    
    console.log(`SignalRGB HTML file created successfully for: ${effect.id}`);
  } catch (err) {
    console.error(`Error processing effect ${effect.id}:`, err);
  }
}

// Let's revert to building each effect separately - simpler and more reliable
export default defineConfig(({ mode }) => {
  if (effectToBuild) {
    // Build a specific effect
    const currentEffect = effects.find(e => e.id === effectToBuild)!;
    
    return {
      server: {
        port: 3000,
        open: true
      },
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(process.cwd(), 'src', currentEffect.entry.replace(/^\.\//, '')),
          output: {
            format: 'iife',
            entryFileNames: `${currentEffect.id}.js`,
            inlineDynamicImports: true,
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
  } else {
    // Main build - build the first effect and then trigger builds for the others
    return {
      server: {
        port: 3000,
        open: true
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: resolve(process.cwd(), 'src', effects[0].entry.replace(/^\.\//, '')),
          output: {
            format: 'iife',
            entryFileNames: `${effects[0].id}.js`,
            inlineDynamicImports: true,
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
        {
          name: 'build-remaining-effects',
          apply: 'build',
          closeBundle() {
            // Only in main build, trigger builds for all other effects
            if (!isRecursiveBuild && !effectToBuild) {
              console.log('Building remaining effects...');
              
              // Skip the first effect since it was just built
              for (let i = 1; i < effects.length; i++) {
                const effect = effects[i];
                console.log(`Building effect: ${effect.id}...`);
                
                try {
                  execSync(`EFFECT=${effect.id} RECURSIVE_BUILD=true npm run build`, {
                    stdio: 'inherit'
                  });
                } catch (error) {
                  console.error(`Error building ${effect.id}:`, error);
                }
              }
            }
          }
        },
        signalRGBPlugin()
      ]
    };
  }
}); 