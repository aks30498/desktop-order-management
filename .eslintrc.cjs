module.exports = {
  root: true,

  env: {
    browser: true,
    node: true,
    es2022: true,
  },

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },

  settings: {
    react: {
      version: "detect",
    },
  },

  plugins: ["react", "react-hooks"],

  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],

  rules: {
    // React 17+ doesn't require React import
    "react/react-in-jsx-scope": "off",

    // Developer-friendly rules
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",

    // Electron preload globals etc
    "no-undef": "off",
  },

  ignorePatterns: ["dist", "node_modules", "build", "out", ".vscode", "*.json"],
};
