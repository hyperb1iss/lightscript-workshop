#!/usr/bin/env node

/**
 * Simple build script that builds all effects one by one
 * This avoids the multi-entry point conflict with Rollup
 */

import { execSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cyberpunk terminal style constants
const NEON_PINK = "\x1b[38;2;255;97;216m";
const NEON_BLUE = "\x1b[38;2;156;158;255m";
const NEON_CYAN = "\x1b[38;2;0;255;255m";
const NEON_GREEN = "\x1b[38;2;0;255;136m";
const NEON_YELLOW = "\x1b[38;2;255;240;0m";
const GLITCH = "\x1b[31m\x1b[1m"; // Bold red for "glitchy" text
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BLINK = "\x1b[5m";
const DIM = "\x1b[2m";

// Display an ASCII cyberpunk header
console.log(`\n${NEON_PINK}
██╗     ██╗ ██████╗ ██╗  ██╗████████╗███████╗ ██████╗██████╗ ██╗██████╗ ████████╗███████╗
██║     ██║██╔════╝ ██║  ██║╚══██╔══╝██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝██╔════╝
██║     ██║██║  ███╗███████║   ██║   ███████╗██║     ██████╔╝██║██████╔╝   ██║   ███████╗
██║     ██║██║   ██║██╔══██║   ██║   ╚════██║██║     ██╔══██╗██║██╔═══╝    ██║   ╚════██║
███████╗██║╚██████╔╝██║  ██║   ██║   ███████║╚██████╗██║  ██║██║██║        ██║   ███████║
╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝   ╚══════╝
${DIM}[ INITIALIZING BUILD SEQUENCE ]${RESET}\n`);

// We can't directly import from .ts files in Node.js ESM
// Instead, let's parse the effects array from the source file

function getEffectsList() {
  console.log(`${NEON_BLUE}[⟁]${RESET} ${DIM}Reading effects list...${RESET}`);
  try {
    // Read the TypeScript source file
    const source = readFileSync(
      resolve(process.cwd(), "src/index.ts"),
      "utf-8"
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

    console.log(`${NEON_GREEN}[✓]${RESET} ${BOLD}Effects loaded${RESET}`);
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
    `${GLITCH}[FATAL] No effects found! Check src/index.ts file.${RESET}`
  );
  process.exit(1);
}

// Ensure the dist directory exists
if (!existsSync("dist")) {
  console.log(`${NEON_CYAN}[⟁]${RESET} Creating dist directory...`);
  mkdirSync("dist");
}

// First, compile TypeScript
console.log(
  `${NEON_CYAN}[⟁]${RESET} ${BOLD}Transpiling${RESET} TypeScript to JavaScript...`
);
execSync("tsc", { stdio: "inherit" });
console.log(
  `${NEON_GREEN}[✓]${RESET} ${BOLD}TypeScript${RESET} compiled successfully\n`
);

// Build each effect one at a time
for (const effect of effects) {
  const effectId = effect.id;

  try {
    // Set the EFFECT environment variable and run vite build
    console.log(`${NEON_YELLOW}[⟁]${RESET} Processing ${effectId}...`);
    execSync(`EFFECT=${effectId} vite build`, {
      stdio: "inherit",
      env: { ...process.env, EFFECT: effectId },
    });
    console.log(
      `${NEON_GREEN}[✓]${RESET} ${BOLD}${effectId}${RESET} ${NEON_GREEN}successfully built${RESET}\n`
    );
  } catch (error) {
    console.error(
      `${GLITCH}[✘] BUILD FAILED FOR ${effectId.toUpperCase()}${RESET}`
    );
    console.error(`${DIM}Error details: ${RESET}`, error);
  }
}

// Create a simple index.html for viewing all effects
console.log(
  `${NEON_BLUE}[⟁]${RESET} ${BOLD}Generating${RESET} gallery page...`
);

// Make the links more cyberpunk with random symbols
const links = effects
  .map((effect) => {
    const glitchChar = ["✧", "⟡", "◈", "⚡", "⚙"][
      Math.floor(Math.random() * 5)
    ];
    return `<li><a href="./${effect.id}.html">${glitchChar} ${effect.id}</a></li>`;
  })
  .join("\n      ");

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LightScripts Gallery</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&display=swap');
    body {
      font-family: 'Rajdhani', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #0a0a16;
      color: #eee;
      background-image: 
        linear-gradient(0deg, rgba(10, 10, 22, 0.9), rgba(10, 10, 22, 0.9)),
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231c1c42' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    h1 {
      color: #ff61d8;
      margin-bottom: 2rem;
      text-transform: uppercase;
      letter-spacing: 3px;
      text-shadow: 0 0 10px #ff61d8, 0 0 20px #ff61d8;
      position: relative;
    }
    h1::after {
      content: "";
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent, #9c9eff, transparent);
    }
    ul {
      list-style-type: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    li {
      margin-bottom: 1rem;
      transition: transform 0.3s ease;
    }
    li:hover {
      transform: translateY(-5px);
    }
    a {
      color: #9c9eff;
      text-decoration: none;
      font-size: 1.2rem;
      padding: 1rem;
      background: rgba(30, 30, 50, 0.6);
      border: 1px solid rgba(76, 78, 180, 0.3);
      border-radius: 4px;
      display: block;
      transition: all 0.2s ease;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    a::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00ffff);
      animation: pulse 2s infinite;
    }
    a:hover {
      background: rgba(30, 30, 50, 0.8);
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
      color: #ffffff;
    }
    @keyframes pulse {
      0% { left: -100%; }
      50% { left: 100%; }
      100% { left: 100%; }
    }
  </style>
</head>
<body>
  <h1>◈ LightScripts Gallery ◈</h1>
  <ul>
      ${links}
  </ul>
</body>
</html>`;

writeFileSync(resolve(process.cwd(), "dist/index.html"), indexHtml);
console.log(`${NEON_GREEN}[✓]${RESET} ${BOLD}Index page${RESET} generated\n`);
