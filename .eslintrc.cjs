module.exports = {
  root: true,
  env: { browser: true, node: true, es2021: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: [
    "node_modules",
    ".svelte-kit",
    ".vscode",
    ".kiro",
    ".windsurf",
    "src",
    "**/*.svelte",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
  },
};
