module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/**/*.test.tsx"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "App.tsx",
    "cloudflare/worker.mjs",
    "!src/screens/HomeScreen.tsx"
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/test/"],
};
