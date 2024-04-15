import FireBaseProvider, { FireBaseProviderConfig } from './FireBaseProvider.js';
import MemoryProvider, { MemoryProviderConfig } from './MemoryProvider.js';

export type DatabaseConfig = MemoryProviderConfig | FireBaseProviderConfig;

export {
  FireBaseProvider,
  MemoryProvider,
};

export type {
  FireBaseProviderConfig,
  MemoryProviderConfig,
};
