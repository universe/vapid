interface ImportMetaEnv {
  readonly API_URL: string;
  readonly STRIPE_TOKEN: string;
  readonly THEME_URL: string;
  readonly THEME_DEV_SERVER: string;
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