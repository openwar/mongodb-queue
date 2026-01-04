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
};

export default config;
