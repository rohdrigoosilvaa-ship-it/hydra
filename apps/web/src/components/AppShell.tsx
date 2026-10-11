import { useEffect, useRef, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/auth-store";
import { api } from "../lib/api";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const { user, setSession } = useAuthStore();
  const [checkingSession, setCheckingSession] = useState(!user);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (user || bootstrapped.current) return;
    bootstrapped.current = true;
    api
      .restoreSession()
      .then((data) => setSession(data.accessToken, data.user))
      .catch(() => undefined)
      .finally(() => setCheckingSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink-muted">Carregando…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
