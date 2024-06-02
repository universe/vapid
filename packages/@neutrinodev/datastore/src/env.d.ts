interface ImportMetaEnv {
  readonly THEME_URL: string;
  readonly FIREBASE_AUTH_EMULATOR_HOST: string;
  readonly FIREBASE_HOSTING_EMULATOR: string;
  readonly FIREBASE_STORAGE_EMULATOR_HOST: string;
  readonly FIRESTORE_EMULATOR_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
