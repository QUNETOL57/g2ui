import { create } from "zustand";

import { getMe, login as loginRequest, register as registerRequest } from "@shared/api/auth";
import type { LoginPayload, RegisterPayload } from "@shared/api/auth";
import { setUnauthorizedHandler } from "@shared/api/client";
import { clearAccessToken, getAccessToken } from "@shared/lib/auth-token";

export interface SessionUser {
  id: string;
  email: string;
}

export type SessionStatus = "unknown" | "guest" | "authenticated";

interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: "unknown",

  hydrate: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ user: null, status: "guest" });
      return;
    }

    try {
      const user = await getMe();
      set({
        user: { id: user.id, email: user.email },
        status: "authenticated",
      });
    } catch {
      clearAccessToken();
      set({ user: null, status: "guest" });
    }
  },

  login: async (payload) => {
    const user = await loginRequest(payload);
    set({
      user: { id: user.id, email: user.email },
      status: "authenticated",
    });
  },

  register: async (payload) => {
    const user = await registerRequest(payload);
    set({
      user: { id: user.id, email: user.email },
      status: "authenticated",
    });
  },

  logout: () => {
    clearAccessToken();
    set({ user: null, status: "guest" });
  },
}));

setUnauthorizedHandler(() => {
  useSessionStore.getState().logout();
});
