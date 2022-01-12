import { IProvider } from "./types";
import MemoryProvider, { MemoryProviderConfig } from './MemoryProvider';
import FireBaseProvider, { FireBaseProviderConfig } from './FireBaseProvider';

export type DatabaseConfig = MemoryProviderConfig | FireBaseProviderConfig;

export {
  IProvider,
  MemoryProvider,
  MemoryProviderConfig,
  FireBaseProvider,
  FireBaseProviderConfig,
}
