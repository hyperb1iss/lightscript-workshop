import type { Plugin } from "vite";
import { resolve } from "path";
import fs from "node:fs";
import { effects } from "../src";

// Get effect to build from environment variable or default to first effect
const effectToBuild = process.env.EFFECT || effects[0]?.id;

/**
 * Helper interface for decorator options
 */
interface DecoratorOption {
  [key: string]: string | boolean | number | string[] | undefined;
}

/**
 * Helper interface for decorator information
 */
interface DecoratorInfo {
  property: string;
  options: DecoratorOption;
}

/**
 * Logging utility for clean, organized output
 */
const logger = {
  effect: (effectId: string, message: string) => {
    console.log(`[✓] ${message} (${effectId})`);
  },
  error: (message: string) => {
    console.error(`[✗] ${message}`);
  },
};

/**
 * Extracts decorator information from a file's content
 */
function extractAllDecorators(
  fileContent: string,
  decoratorName: string,
): DecoratorInfo[] {
  const results: DecoratorInfo[] = [];

  // Handle both @Decorator({...}) and @Decorator("...")
  const decoratorRegex = new RegExp(
    `@${decoratorName}\\s*\\(\\s*(?:{([\\s\\S]*?)}|["']([\\s\\S]*?)["'])\\s*\\)\\s*([a-zA-Z0-9_]+)`,
    "g",
  );

  let match;
  while ((match = decoratorRegex.exec(fileContent)) !== null) {
    try {
      let options: DecoratorOption = {};
      const propertyName = match[3]; // The property/field name

      if (match[1]) {
        // Object literal style: @Decorator({ ... })
        const optionsText = match[1];

        // Extract key-value pairs using more robust regex
        const keyValuePairs =
          optionsText.match(
            /([a-zA-Z0-9_]+)\s*:\s*(?:(?:\[([\s\S]*?)\])|(?:"([^"]*)")|(?:'([^']*)')|(?:([^,\s}]+)))/g,
          ) || [];

        for (const pair of keyValuePairs) {
          const [key, value] = pair.split(":").map((part) => part.trim());

          if (value) {
            if (value.startsWith("[") && value.endsWith("]")) {
              // Handle array values
              const arrayContent = value.slice(1, -1);
              options[key] = arrayContent
                .split(",")
                .map((item) => item.trim().replace(/^["']|["']$/g, ""))
                .filter(Boolean);
            } else if (value.startsWith('"') || value.startsWith("'")) {
              // Handle string values
              options[key] = value.slice(1, -1);
            } else if (/^(true|false)$/i.test(value)) {
              // Handle boolean values
              options[key] = value.toLowerCase() === "true";
            } else if (!isNaN(parseFloat(value))) {
              // Handle numeric values
              options[key] = parseFloat(value);
            } else {
              // Handle other values as strings
              options[key] = value;
            }
          }
        }
      } else if (match[2]) {
        // String literal style: @Decorator("...")
        if (decoratorName === "Effect") {
          options = { name: match[2] };
        } else {
          options = { label: match[2] };
        }
      }

      results.push({
        property: propertyName,
        options: options,
      });
    } catch (err) {
      logger.error(`Error parsing ${decoratorName} decorator`);
    }
  }

  return results;
}

/**
 * Process a single effect (create HTML file from JS)
 */
function processEffect(effect: (typeof effects)[0]) {
  try {
    // Read the compiled output JavaScript
    const jsOutputPath = resolve(process.cwd(), `dist/${effect.id}.js`);
    let jsContent;

    if (fs.existsSync(jsOutputPath)) {
      jsContent = fs.readFileSync(jsOutputPath, "utf-8");
    } else {
      logger.error(`No JS output found for effect: ${effect.id}`);
      jsContent = "// No JS content found";
    }

    // Extract metadata for decorator effects using a more robust approach
    let metaTags = "";
    let effectName = effect.id;
    let effectDescription = "";
    let effectAuthor = "";

    try {
      // Read the source files to extract decorator information
      const sourcePath = effect.entry.replace(/^\.\//, "");
      const fullSourcePath = resolve(process.cwd(), "src", sourcePath);

      if (fs.existsSync(fullSourcePath)) {
        const sourceContent = fs.readFileSync(fullSourcePath, "utf-8");

        // Array to store files we need to check for decorators
        const filesToCheck = [{ path: fullSourcePath, content: sourceContent }];

        // Find all import statements that might contain effect implementation classes
        const importRegex =
          /import\s+(?:{[^}]*}|\*\s+as\s+[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
        let importMatch;
        const mainFileDir = resolve(
          process.cwd(),
          "src",
          sourcePath.substring(0, sourcePath.lastIndexOf("/")),
        );

        while ((importMatch = importRegex.exec(sourceContent)) !== null) {
          const importPath = importMatch[1];
          // Skip node_modules imports
          if (importPath.startsWith(".")) {
            // Resolve the import path
            let importPathResolved = resolve(mainFileDir, importPath);

            // Try both .ts and .tsx extensions
            if (
              !importPathResolved.endsWith(".ts") &&
              !importPathResolved.endsWith(".tsx")
            ) {
              // Try with .ts first, then .tsx
              if (fs.existsSync(importPathResolved + ".ts")) {
                importPathResolved += ".ts";
              } else if (fs.existsSync(importPathResolved + ".tsx")) {
                importPathResolved += ".tsx";
              } else {
                // Try as a directory with index.ts
                const indexPath = resolve(importPathResolved, "index.ts");
                if (fs.existsSync(indexPath)) {
                  importPathResolved = indexPath;
                } else {
                  continue; // Skip if we can't resolve the import
                }
              }
            }

            if (fs.existsSync(importPathResolved)) {
              const importContent = fs.readFileSync(
                importPathResolved,
                "utf-8",
              );

              // Check if the file contains Effect or Control decorators
              if (
                importContent.includes("@Effect") ||
                importContent.includes("@NumberControl") ||
                importContent.includes("@BooleanControl") ||
                importContent.includes("@ComboboxControl") ||
                importContent.includes("@HueControl") ||
                importContent.includes("@ColorControl") ||
                importContent.includes("@TextFieldControl")
              ) {
                filesToCheck.push({
                  path: importPathResolved,
                  content: importContent,
                });
              }
            }
          }
        }

        // Process all potential implementation files
        for (const file of filesToCheck) {
          // Extract Effect decorator information
          const effectDecorators = extractAllDecorators(file.content, "Effect");
          if (effectDecorators.length > 0) {
            // Use the first Effect decorator found
            const effectData = effectDecorators[0].options;
            if (effectData.name && typeof effectData.name === "string") {
              effectName = effectData.name;
            }

            if (
              effectData.description &&
              typeof effectData.description === "string"
            ) {
              effectDescription = effectData.description;
            }

            if (effectData.author && typeof effectData.author === "string") {
              effectAuthor = effectData.author;
            }
          }

          // Add effect metadata tags
          metaTags += `<meta name="name" content="${effectName}">\n`;
          if (effectDescription) {
            metaTags += `<meta name="description" content="${effectDescription}">\n`;
          }
          if (effectAuthor) {
            metaTags += `<meta name="author" content="${effectAuthor}">\n`;
          }

          // Extract control decorators
          const controlsData = {
            Number: extractAllDecorators(file.content, "NumberControl"),
            Boolean: extractAllDecorators(file.content, "BooleanControl"),
            Combobox: extractAllDecorators(file.content, "ComboboxControl"),
            Hue: extractAllDecorators(file.content, "HueControl"),
            Color: extractAllDecorators(file.content, "ColorControl"),
            TextField: extractAllDecorators(file.content, "TextFieldControl"),
          };

          // Process all control decorators
          let controlCount = 0;
          for (const [controlType, decorators] of Object.entries(
            controlsData,
          )) {
            for (const decorator of decorators) {
              const propertyName = decorator.property;
              const options = decorator.options;

              const label = options.label || propertyName;
              const defaultValue =
                options.default?.toString().replace(/["']/g, "") || "";
              const tooltip = options.tooltip || "";

              if (controlType === "Number") {
                const min = options.min?.toString() || "0";
                const max = options.max?.toString() || "100";
                metaTags += `<meta property="${propertyName}" label="${label}" type="number" min="${min}" max="${max}" default="${defaultValue}"${tooltip ? ` tooltip="${tooltip}"` : ""}>\n`;
                controlCount++;
              } else if (controlType === "Boolean") {
                metaTags += `<meta property="${propertyName}" label="${label}" type="boolean" default="${defaultValue}"${tooltip ? ` tooltip="${tooltip}"` : ""}>\n`;
                controlCount++;
              } else if (controlType === "Combobox") {
                let values = "";
                if (options.values && Array.isArray(options.values)) {
                  values = options.values
                    .map((v) => v.toString().replace(/["']/g, ""))
                    .join(",");
                }
                metaTags += `<meta property="${propertyName}" label="${label}" type="combobox" values="${values}" default="${defaultValue}"${tooltip ? ` tooltip="${tooltip}"` : ""}>\n`;
                controlCount++;
              } else if (controlType === "Hue") {
                const min = options.min?.toString() || "0";
                const max = options.max?.toString() || "360";
                metaTags += `<meta property="${propertyName}" label="${label}" type="hue" min="${min}" max="${max}" default="${defaultValue}"${tooltip ? ` tooltip="${tooltip}"` : ""}>\n`;
                controlCount++;
              } else if (controlType === "Color") {
                metaTags += `<meta property="${propertyName}" label="${label}" type="color" default="${defaultValue}"${tooltip ? ` tooltip="${tooltip}"` : ""}>\n`;
                controlCount++;
              } else if (controlType === "TextField") {
                metaTags += `<meta property="${propertyName}" label="${label}" type="textfield" default="${defaultValue}"${tooltip ? ` tooltip="${tooltip}"` : ""}>\n`;
                controlCount++;
              }
            }
          }

          if (controlCount > 0) {
            // If we found controls, we can stop checking other files
            break;
          }
        }
      }
    } catch (err) {
      logger.error(`Error extracting metadata for ${effect.id}`);
    }

    // Generate a template with the extracted metadata
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="keywords" content="SignalRGB, LightScript, effect">
  <title>${effectName}</title>
  ${metaTags}
</head>
<body>
  <canvas id="exCanvas" width="320" height="200"></canvas>
  <script>
    <!-- BUNDLE_SCRIPT_INJECT -->
  </script>
</body>
</html>`;

    // Replace the bundle marker comment with the actual script content
    const bundleMarker = "<!-- BUNDLE_SCRIPT_INJECT -->";
    const finalHtml = template.replace(bundleMarker, jsContent);

    // Write the output files
    fs.writeFileSync(
      resolve(process.cwd(), `dist/${effect.id}.html`),
      finalHtml,
    );

    logger.effect(effect.id, "HTML file created successfully");
  } catch (err) {
    logger.error(`Error processing effect ${effect.id}`);
  }
}

/**
 * Vite plugin that creates SignalRGB-compatible HTML files
 */
export function signalRGBPlugin(): Plugin {
  return {
    name: "signalrgb-plugin",
    apply: "build", // only apply during build

    // After build is complete
    closeBundle() {
      if (!effectToBuild) {
        logger.error("No effects found in the effects array!");
        return;
      }

      const effect = effects.find((e) => e.id === effectToBuild);
      if (!effect) {
        logger.error(`Effect ${effectToBuild} not found!`);
        return;
      }

      processEffect(effect);
    },
  };
}
