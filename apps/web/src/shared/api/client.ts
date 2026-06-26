import { clearAccessToken, getAccessToken } from "@shared/lib/auth-token";

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function isApiConfigured(): boolean {
  return import.meta.env.MODE !== "test" && API_BASE_URL.length > 0;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(parseApiErrorDetail(message));
    this.name = "ApiError";
    this.status = status;
  }
}

export function parseApiErrorDetail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    return trimmed;
  }
  return trimmed;
}

export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError("VITE_API_URL is not configured", 0);
  }

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearAccessToken();
    unauthorizedHandler?.();
    const message = await response.text();
    throw new ApiError(message || "Unauthorized", 401);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || `Request failed with ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
