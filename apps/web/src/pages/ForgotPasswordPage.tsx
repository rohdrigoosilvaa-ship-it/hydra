import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Logo } from "../components/Logo";

export function ForgotPasswordPage() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(tenantSlug, email);
    } finally {
      // Sempre mostra a mesma mensagem, exista ou não a conta — evita
      // revelar quais e-mails têm cadastro no sistema.
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-paper-raised shadow-sm p-8 shadow-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              Se houver uma conta com esse e-mail, enviamos um link para redefinição de senha.
            </p>
            <Link to="/login" className="btn-secondary text-center">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">
              Informe sua empresa e e-mail — se houver uma conta associada, enviaremos um link de
              redefinição.
            </p>
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

            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? "Enviando…" : "Enviar link de redefinição"}
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
