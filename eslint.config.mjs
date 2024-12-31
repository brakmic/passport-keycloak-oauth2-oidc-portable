import globals from "globals";
import pluginJs from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Place recommended rules first
  pluginJs.configs.recommended,

  // Configuration for CommonJS (.js) files
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      "no-unused-vars": ["error", { 
        argsIgnorePattern: "^_.*$",
        varsIgnorePattern: "^_.*$"
      }],
      "no-undef": "error",
      "jest/valid-expect": "error",
    },
    settings: {
      jest: {
        version: "detect",
      },
    },
  },

  // Configuration for ESM (.mjs) files
  {
    files: ["**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      "no-unused-vars": ["error", { 
        argsIgnorePattern: "^_.*$",
        varsIgnorePattern: "^_.*$"
      }],
      "no-undef": "error",
      "jest/valid-expect": "error",
    },
    settings: {
      jest: {
        version: "detect",
      },
    },
  },
  // Removed the duplicate recommended config here
];
