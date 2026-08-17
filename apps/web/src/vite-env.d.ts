/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_LOG_LEVEL?: string;
}

/** Chromium EyeDropper API (https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API). */
interface EyeDropper {
  open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }>;
}

interface Window {
  EyeDropper?: new () => EyeDropper;
}
