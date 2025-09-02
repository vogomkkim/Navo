import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '@/modules/(.*)': '<rootDir>/src/modules/$1',
    '@/lib/(.*)': '<rootDir>/src/lib/$1',
    '@/db/(.*)': '<rootDir>/../db/$1',
    '@/config/(.*)': '<rootDir>/src/config/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};

export default config;
