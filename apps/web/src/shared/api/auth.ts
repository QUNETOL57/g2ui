import { fetchJson } from "@shared/api/client";
import { setAccessToken } from "@shared/lib/auth-token";

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const tokenResponse = await fetchJson<TokenResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAccessToken(tokenResponse.access_token);
  return getMe();
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const tokenResponse = await fetchJson<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAccessToken(tokenResponse.access_token);
  return getMe();
}

export async function getMe(): Promise<AuthUser> {
  return fetchJson<AuthUser>("/api/v1/auth/me");
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await fetchJson<void>("/api/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
