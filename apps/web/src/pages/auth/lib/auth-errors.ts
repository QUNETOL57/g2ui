import { ApiError } from "@shared/api/client";

export function parseAuthError(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) {
    if (!error.message) return fallback;
    try {
      const parsed = JSON.parse(error.message) as { detail?: unknown };
      if (typeof parsed.detail === "string") {
        return parsed.detail;
      }
      if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
        const first = parsed.detail[0] as { msg?: string };
        if (typeof first.msg === "string") {
          return first.msg;
        }
      }
    } catch {
      return error.message;
    }
    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}
