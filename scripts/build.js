#!/usr/bin/env node

/**
 * Simple build script that builds all effects one by one
 * This avoids the multi-entry point conflict with Rollup
 */

import { execSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const NEON_PINK = "\x1b[38;2;255;97;216m";
const NEON_BLUE = "\x1b[38;2;156;158;255m";
const NEON_CYAN = "\x1b[38;2;0;255;255m";
const NEON_GREEN = "\x1b[38;2;0;255;136m";
const NEON_YELLOW = "\x1b[38;2;255;240;0m";
const NEON_PURPLE = "\x1b[38;2;190;110;255m";
const GLITCH = "\x1b[31m\x1b[1m"; // Bold red for "glitchy" text
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BLINK = "\x1b[5m";
const DIM = "\x1b[2m";

console.log(`\n${NEON_CYAN}
██╗     ██╗ ██████╗ ██╗  ██╗████████╗███████╗ ██████╗██████╗ ██╗██████╗ ████████╗
██║     ██║██╔════╝ ██║  ██║╚══██╔══╝██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝
██║     ██║██║  ███╗███████║   ██║   ███████╗██║     ██████╔╝██║██████╔╝   ██║   
██║     ██║██║   ██║██╔══██║   ██║   ╚════██║██║     ██╔══██╗██║██╔═══╝    ██║   
███████╗██║╚██████╔╝██║  ██║   ██║   ███████║╚██████╗██║  ██║██║██║        ██║   
╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝   
${NEON_PINK}
      ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗███████╗██╗  ██╗ ██████╗ ██████╗ 
      ██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██╔════╝██║  ██║██╔═══██╗██╔══██╗
      ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ███████╗███████║██║   ██║██████╔╝
      ██║███╗██║██║   ██║██╔══██╗██╔═██╗ ╚════██║██╔══██║██║   ██║██╔═══╝ 
      ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗███████║██║  ██║╚██████╔╝██║     
       ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     
`);

// We can't directly import from .ts files in Node.js ESM
// Instead, let's parse the effects array from the source file

function getEffectsList() {
  console.log(
    `${NEON_BLUE}[⚡]${RESET} ${DIM}Reading effects manifest...${RESET}`,
  );
  try {
    // Read the TypeScript source file
    const source = readFileSync(
      resolve(process.cwd(), "src/index.ts"),
      "utf-8",
    );

    // Extract the effects array using a regex pattern
    // This is a simple approach - in a larger project we might want to use a TS parser
    const effectsMatch = source.match(/export const effects = (\[[\s\S]*?\]);/);

    if (!effectsMatch || !effectsMatch[1]) {
      throw new Error("Could not find effects array in src/index.ts");
    }

    // Evaluate the array (safe since we control the source)
    // Replace TypeScript-specific syntax with JS equivalents if needed
    const effectsStr = effectsMatch[1].replace(/\/\/.*$/gm, "");
    const effects = eval(`(${effectsStr})`);

    console.log(
      `${NEON_GREEN}[✓]${RESET} ${BOLD}Effects manifest loaded${RESET}`,
    );
    return effects;
  } catch (err) {
    console.error(`${GLITCH}[✘] ERROR: Failed to parse effects${RESET}`, err);
    return [];
  }
}

// Get effects list
const effects = getEffectsList();

if (effects.length === 0) {
  console.error(
    `${GLITCH}[FATAL] No effects found! Check src/index.ts file.${RESET}`,
  );
  process.exit(1);
}

// Ensure the dist directory exists
if (!existsSync("dist")) {
  console.log(`${NEON_CYAN}[⟁]${RESET} Creating distribution matrix...`);
  mkdirSync("dist");
}

// First, compile TypeScript
console.log(
  `${NEON_PURPLE}[⟁]${RESET} ${BOLD}Transmuting${RESET} TypeScript to JavaScript...`,
);
execSync("tsc", { stdio: "inherit" });
console.log(
  `${NEON_GREEN}[✓]${RESET} ${BOLD}TypeScript${RESET} compilation ${NEON_CYAN}successful${RESET}\n`,
);

// Build each effect one at a time
let counter = 0;
const total = effects.length;

for (const effect of effects) {
  const effectId = effect.id;
  counter++;

  try {
    // Set the EFFECT environment variable and run vite build
    console.log(
      `${NEON_YELLOW}[⚡]${RESET} Processing effect ${counter}/${total}: ${BOLD}${effectId}${RESET}...`,
    );
    execSync(`EFFECT=${effectId} vite build`, {
      stdio: "inherit",
      env: { ...process.env, EFFECT: effectId },
    });
    console.log(
      `${NEON_GREEN}[✓]${RESET} ${BOLD}${effectId}${RESET} ${NEON_GREEN}successfully encoded${RESET}\n`,
    );
  } catch (error) {
    console.error(
      `${GLITCH}[✘] BUILD FAILED FOR ${effectId.toUpperCase()}${RESET}`,
    );
    console.error(`${DIM}Error details: ${RESET}`, error);
  }
}
