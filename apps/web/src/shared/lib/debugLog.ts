const LOG_LEVEL = String(import.meta.env.VITE_LOG_LEVEL ?? (import.meta.env.DEV ? "warn" : "error")).toLowerCase();

export function debugLog(scope: string, message: string, data?: Record<string, unknown>): void {
  if (LOG_LEVEL !== "debug") return;
  console.debug(`[${scope}] ${message}`, data ?? {});
}
