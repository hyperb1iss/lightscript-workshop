import type { Plugin } from "vite";
import fs from "node:fs";

/**
 * Plugin that adds support for TypeScript decorators in development mode
 * Handles @Effect and various @*Control decorators
 */
export function lightscriptDecoratorsPlugin(): Plugin {
  return {
    name: "lightscript-decorators",
    transform(code, id) {
      // Apply to any TypeScript files in the src directory that might use decorators
      if (
        id.includes("/src/") &&
        id.endsWith(".ts") &&
        (code.includes("@Effect") ||
          code.includes("@NumberControl") ||
          code.includes("@BooleanControl") ||
          code.includes("@ComboboxControl") ||
          code.includes("@HueControl") ||
          code.includes("@ColorControl") ||
          code.includes("@TextFieldControl"))
      ) {
        // Add reflect-metadata import if it's not already there
        const hasReflectImport =
          code.includes('import "reflect-metadata"') ||
          code.includes("import 'reflect-metadata'");

        let modifiedCode = code;
        if (!hasReflectImport) {
          modifiedCode = `import 'reflect-metadata';\n${code}`;
        }

        // Make sure symbols for decorators are preserved in dev mode
        const keepSymbols = `
// Ensure decorator symbols are preserved for dev mode
const DECORATOR_METADATA_SYMBOL = Symbol.for('lightscript:controls');
const EFFECT_METADATA_SYMBOL = Symbol.for('lightscript:effect');
`;

        console.log(`[LightScript] Applied decorator support to: ${id}`);
        return {
          code: keepSymbols + modifiedCode,
          map: null,
        };
      }
      return null;
    },
    configureServer(server) {
      // Watch for effect changes and reload when necessary
      server.watcher.on("change", (path) => {
        if (path.endsWith(".ts") && fs.existsSync(path)) {
          try {
            const content = fs.readFileSync(path, "utf-8");
            if (
              content.includes("@Effect") ||
              content.includes("@NumberControl") ||
              content.includes("@BooleanControl") ||
              content.includes("@ComboboxControl")
            ) {
              console.log(
                `[LightScript] Detected change in decorator file: ${path}`,
              );
              server.ws.send({ type: "full-reload" });
            }
          } catch (err) {
            console.error(`[LightScript] Error checking file ${path}:`, err);
          }
        }
      });
    },
  };
}
