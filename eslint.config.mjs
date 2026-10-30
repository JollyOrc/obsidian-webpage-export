import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** US-001 AC-2: the fork's new code, linted with the strict block. */
const NEW_CODE = ["src/core/**/*.ts", "tests/**/*.ts", "tools/**/*.ts", "vitest.config.ts"];


export default [
  // US-001 AC-7: generated fixture content and fetched third-party plugins
  // are not the fork's code (prettier skips them too, .prettierignore).
  { ignores: ["tests/fixtures/vault/**", "tests/.output/**"] },
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // US-001 AC-2: new code of the fork (src/core, tests, tools) is linted
  // strictly; the entries above are upstream's and stay unchanged, so the
  // upstream finding count (tools/lint-baseline.json) is not affected.
  ...tseslint.configs.strict.map((c) => ({ ...c, files: NEW_CODE })),
  {
    files: NEW_CODE,
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];