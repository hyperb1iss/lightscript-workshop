# LightScripts Framework Tests

This directory contains unit and integration tests for the LightScripts framework. The tests are written using [Vitest](https://vitest.dev/), a Vite-native testing framework.

## Test Structure

- `controls.test.ts` - Tests for the control utilities module
- `debug.test.ts` - Tests for the debug logging module
- `parser.test.ts` - Tests for the HTML template parser
- `effect.test.ts` - Tests for the BaseEffect class
- `engine.test.ts` - Tests for the DevEngine
- `build.test.ts` - Tests for the build process and effects configuration

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests once
npm test

# Run tests in watch mode (automatically rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

We aim to maintain high test coverage for the framework code. The coverage report will show which parts of the code are covered by tests. The report is generated in the `coverage` directory when running the `test:coverage` script.

## Adding New Tests

When adding new features to the framework:

1. Add corresponding test files in this directory
2. Follow the naming convention: `<module-name>.test.ts`
3. Use the existing tests as a reference for structure and style
4. Make sure to test both success and error conditions

## Mocking

Many tests use mocks to isolate the component being tested:

- THREE.js is mocked to avoid creating actual WebGL contexts in tests
- DOM APIs like `document` and `window` are mocked when needed
- The file system (fs) is mocked for build process tests

## Continuous Integration

These tests run automatically in CI when changes are pushed to the repository. All tests must pass before the pull request can be merged. 