interface ImportMetaEnv {
  readonly API_URL: string;
  readonly THEME_URL: string;
  readonly STRIPE_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
