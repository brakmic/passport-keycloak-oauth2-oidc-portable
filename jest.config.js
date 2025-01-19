module.exports = {
  preset: "ts-jest/presets/default",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  testMatch: [
    "**/test/unit/**/*.test.ts",
    "**/test/integration/**/*.test.ts",
    "**/test/e2e/**/*.test.ts",
    "**/test/package/**/*.test.ts",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage",
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
  verbose: true,
};
