import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/drizzle/(.*)$': '<rootDir>/drizzle/$1.ts',
    '^@/drizzle/schema$': '<rootDir>/drizzle/schema.ts',
    '^@/schema$': '<rootDir>/drizzle/schema.ts',
    '^@/db/db.instance$': '<rootDir>/src/modules/db/__mocks__/db.instance.ts',
    '^@/db$': '<rootDir>/src/modules/db/index.ts',
    '^@/db/(.*)$': '<rootDir>/src/modules/db/$1',
    '^@/modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/config$': '<rootDir>/src/config/index.ts',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};

export default config;
