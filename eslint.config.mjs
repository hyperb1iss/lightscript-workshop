import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const eslintConfig = [
  // Base configuration for all files

  // Configuration for JavaScript files
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },

  // Configuration for TypeScript files in source and tests
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^h$",
          caughtErrorsIgnorePattern: "^_"
        },
      ],
    },
  },

  // Add TypeScript recommended rules for TypeScript files
  ...compat.extends("plugin:@typescript-eslint/recommended"),

  // Special rules for test files - must come after the recommended rules to properly override them
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      // Relax certain rules for test files
      "@typescript-eslint/no-explicit-any": "off",
      // Allow non-null assertions in tests
      "@typescript-eslint/no-non-null-assertion": "off",
      // Allow empty functions for mocks
      "@typescript-eslint/no-empty-function": "off",
      // Allow unused variables in tests
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow @ts-ignore in tests
      "@typescript-eslint/ban-ts-comment": "warn"
    },
  },
];

export default eslintConfig;
