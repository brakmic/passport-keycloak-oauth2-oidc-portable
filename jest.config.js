module.exports = {
  preset: "ts-jest/presets/default", // Use ts-jest preset for TypeScript and Jest integration
  testEnvironment: "node", // Use Node.js environment for testing
  roots: ["<rootDir>/test"], // Test folder location
  moduleFileExtensions: ["ts", "js"], // Allow both .ts and .js in tests
  transform: {
    "^.+\\.ts$": [
      "ts-jest", 
      {
        tsconfig: "<rootDir>/tsconfig.test.json", // Use the test-specific tsconfig
      },
    ], // Transpile .ts files with ts-jest
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"], // Ignore node_modules and dist during tests
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: "<rootDir>/coverage", // Output directory for coverage reports
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"], // Ignore coverage for specific paths
  verbose: true, // Display individual test results with execution times
};
