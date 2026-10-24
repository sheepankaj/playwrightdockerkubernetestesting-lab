import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["tests/**/*.spec.ts"],
    plugins: { playwright },
    rules: {
      ...playwright.configs["flat/recommended"].rules,
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": "warn",
    },
  },
  {
    ignores: ["node_modules/", "playwright-report/", "test-results/"],
  },
);
