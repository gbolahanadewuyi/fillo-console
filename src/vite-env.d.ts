/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** "local" = our own accounts; anything else = Firebase Auth (default). See src/lib/auth-mode.ts. */
  readonly VITE_AUTH_PROVIDER?: string;
  /** Show the seeded demo-account picker on the login page (always shown in dev builds). */
  readonly VITE_SHOW_DEMO_ACCOUNTS?: string;
  readonly VITE_USE_EMULATORS?: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
