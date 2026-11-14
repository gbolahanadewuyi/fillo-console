/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Show the seeded demo-account picker on the login page (always shown in dev builds). */
  readonly VITE_SHOW_DEMO_ACCOUNTS?: string;
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
