import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const config: Config = {
  displayName: 'qualia',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock next/cache to avoid Web API globals requirement in jsdom test environment
    '^next/cache$': '<rootDir>/__tests__/utils/next-cache-mock.ts',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/__tests__/utils/',
    '<rootDir>/__tests__/actions/test-utils.ts',
  ],
  collectCoverageFrom: [
    // Server-side action modules (business logic)
    'app/actions/**/*.ts',
    // Core lib utilities
    'lib/server-utils.ts',
    'lib/validation.ts',
    'lib/color-constants.ts',
    'lib/project-phases.ts',
    'lib/schedule-utils.ts',
    'lib/format-currency.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    // Exclude re-export routers
    '!app/actions/index.ts',
    '!app/actions.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
};

export default createJestConfig(config);
