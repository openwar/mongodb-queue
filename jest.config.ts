import type { Config } from '@jest/types';
import { defaults } from 'jest-config';

// Sync object
const config: Config.InitialOptions = {
  coveragePathIgnorePatterns: [
    ...defaults.coveragePathIgnorePatterns,
    '__helpers__',
  ],
  // Transform test files with ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Map source imports to built dist for E2E testing
  moduleNameMapper: {
    '^(\\.\\./)+mongodb-queue$': '<rootDir>/dist/mongodb-queue.cjs',
  },
};

export default config;
