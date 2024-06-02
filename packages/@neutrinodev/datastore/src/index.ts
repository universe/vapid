declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      TEMPLATES_PATH: string;
      FIRESTORE_EMULATOR_HOST: string;
      FIREBASE_AUTH_EMULATOR_HOST: string;
      FIREBASE_HOSTING_EMULATOR: string;
    }
  }
}

export * from './providers/index.js';
export type { IProvider, IRecord, ITemplate } from '@neutrinodev/core';
export { PageType, Record, Template } from '@neutrinodev/core';
