# Makefile

# Define test commands
TEST_INTEGRATION = jest --testPathPattern=./test/integration.test.js
TEST_PACKAGE = jest --testPathPattern=./test/package.test.js
TEST_STRATEGY = jest --testPathPattern=./test/strategy.test.js
NPM = pnpm

# Perform self-tests.
check: test

test:
	@echo "Running all tests..."
	${NPM} test

test-integration:
	@echo "Running integration tests..."
	${NPM} run test:integration

test-package:
	@echo "Running package tests..."
	${NPM} run test-package

test-strategy:
	@echo "Running strategy tests..."
	${NPM} run test-strategy
