/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly __BUILD_TIME__?: string;
  readonly __BUILD_DATE__?: string;
  readonly __BUILD_TIME_ONLY__?: string;
  readonly __BUILD_NUMBER__?: string;
  readonly VITE_SHOW_DEBUG_INDICATOR?: string;
  readonly VITE_ALLOWED_REDIRECTS?: string;
  readonly VITE_DEFAULT_RETURN_URL?: string;
  readonly VITE_FIREBASE_MODE?: string;
  readonly VITE_USE_FIREBASE_EMULATOR?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_NONCE_SECRET?: string;
  readonly VITE_NONCE_MAX_AGE_MS?: string;
  readonly PROD?: boolean;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
