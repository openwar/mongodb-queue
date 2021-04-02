import type { Config } from '@jest/types';
import { defaults } from 'jest-config';

// Sync object
const config: Config.InitialOptions = {
  coveragePathIgnorePatterns: [
    ...defaults.coveragePathIgnorePatterns,
    '__helpers__',
  ],
};

export default config;
