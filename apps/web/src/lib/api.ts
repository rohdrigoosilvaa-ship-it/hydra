import { useAuthStore, type AuthUser } from "./auth-store";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
    useAuthStore.getState().clearSession();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? "Erro inesperado ao falar com a API.");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Baixa um arquivo binário (ex.: PDF) autenticado — devolve o Blob e o nome sugerido. */
async function requestBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? "Erro inesperado ao falar com a API.");
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? "arquivo";
  const blob = await res.blob();
  return { blob, filename };
}

/** Upload multipart — sem Content-Type manual: o browser define o boundary sozinho. */
async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? "Erro inesperado ao falar com a API.");
  }
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const data = await request<LoginResponse>("/auth/refresh", { method: "POST" }, false);
    useAuthStore.getState().setSession(data.accessToken, data.user);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  login: (tenantSlug: string, email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ tenantSlug, email, password }),
    }),
  /** Tenta restaurar a sessão a partir do cookie de refresh (ex.: após F5). */
  restoreSession: () => request<LoginResponse>("/auth/refresh", { method: "POST" }, false),
  logout: () => request<{ success: true }>("/auth/logout", { method: "POST" }),
  forgotPassword: (tenantSlug: string, email: string) =>
    request<{ success: true }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ tenantSlug, email }) },
      false,
    ),
  resetPassword: (token: string, newPassword: string) =>
    request<{ success: true }>(
      "/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, newPassword }) },
      false,
    ),
  get: <T>(path: string) => request<T>(path),
  getBlob: (path: string) => requestBlob(path),
  postForm: <T>(path: string, formData: FormData) => requestForm<T>(path, formData),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
