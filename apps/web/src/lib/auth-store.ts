import { create } from "zustand";

export interface RoleAssignment {
  role: string;
  scopeType: "TENANT" | "COMPANY" | "BRANCH" | "UNIT";
  scopeId: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  assignments: RoleAssignment[];
  /** null = acesso administrativo (todas as empresas do tenant). */
  company: { id: string; name: string } | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
}

/** Access token só em memória (nunca localStorage) — refresh vive em cookie httpOnly. */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
}));
