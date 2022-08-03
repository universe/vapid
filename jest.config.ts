import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  displayName: 'Neutrino Unit Tests',
  preset: 'ts-jest',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/../__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/../__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.(ts|js|html)$': 'ts-jest',
  },
  testMatch: [
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  testPathIgnorePatterns: [
    '/dist/',
    '/bundle/',
    '/fixtures/',
    '/cjs/',
    '/esm/',
    '/test/',
  ],
};

export default config;
