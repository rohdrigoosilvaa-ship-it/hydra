import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/auth-store";
import { Logo } from "../components/Logo";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await api.login(tenantSlug, email, password);
      setSession(accessToken, user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-paper-raised shadow-sm p-8 shadow-sm">
        <div className="mb-2 flex justify-center">
          <Logo size="lg" />
        </div>
        <p className="mb-8 text-center text-xs text-ink-muted">
          Uma plataforma inteligente para transformar a gestão de SST.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Empresa" htmlFor="tenantSlug">
            <input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="hydra-demo"
              className="input"
              required
            />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hydra.local"
              className="input"
              required
            />
          </Field>
          <Field label="Senha" htmlFor="password">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </Field>

          {error && (
            <p className="rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <Link to="/esqueci-minha-senha" className="text-center text-sm text-ink-muted hover:text-ink">
            Esqueci minha senha
          </Link>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
