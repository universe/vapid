interface ImportMetaEnv {
  readonly API_URL: string;
  readonly STRIPE_TOKEN: string;
  readonly THEME_URL: string;
  readonly THEME_DEV_SERVER: string;
  readonly FIREBASE_AUTH_EMULATOR_HOST: string;
  readonly FIREBASE_HOSTING_EMULATOR: string;
  readonly FIREBASE_STORAGE_EMULATOR_HOST: string;
  readonly FIRESTORE_EMULATOR_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module 'charming' {
  export default function charming(el: Element): void;
}