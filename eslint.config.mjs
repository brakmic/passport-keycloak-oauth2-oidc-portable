import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals";
import jestPlugin from "eslint-plugin-jest";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

// Initialize FlatCompat
const compat = new FlatCompat();

export default [
  // Ignore patterns to exclude all `.js`, `.mjs`, and other irrelevant files
  {
    ignores: ["**/*.js", "**/*.mjs", "dist/", "node_modules/", "temp/"],
  },

  // TypeScript linting rules
  {
    files: ["**/*.ts"], // Only apply rules to TypeScript files
    languageOptions: {
      parser: typescriptParser, // Use TypeScript parser
      parserOptions: {
        project: "./tsconfig.eslint.json", // ESLint-specific TSConfig
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      jest: jestPlugin,
    },
    rules: {
      // Suppress specific rules globally
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off", // Disable warning for `any` types

      // Configure no-unused-vars rule
      // Update for no-unused-vars rule in eslint.config.mjs
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all", // Check all arguments
          argsIgnorePattern: "^_", // Ignore arguments prefixed with "_"
          vars: "all", // Check all variables
          varsIgnorePattern: "^_", // Ignore variables prefixed with "_"
          caughtErrors: "all", // Check all caught errors
          caughtErrorsIgnorePattern: "^_", // Ignore caught errors prefixed with "_"
        },
      ],

      "@typescript-eslint/no-unsafe-function-type": "off", // Suppress unsafe function type errors
    },
    settings: {
      jest: {
        version: "detect", // Automatically detect Jest version
      },
    },
  },
];
