import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Logo } from "../components/Logo";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-paper-raised p-8 shadow-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {!token ? (
          <p className="rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm text-ink">
            Link inválido — solicite uma nova redefinição de senha.
          </p>
        ) : done ? (
          <p className="text-sm text-ink">Senha redefinida! Levando você ao login…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nova senha" htmlFor="newPassword">
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                className="input"
                required
              />
            </Field>
            <Field label="Confirmar senha" htmlFor="confirmPassword">
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
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
              {loading ? "Salvando…" : "Redefinir senha"}
            </button>
            <Link to="/login" className="text-center text-sm text-ink-muted hover:text-ink">
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
