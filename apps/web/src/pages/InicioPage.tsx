import { Link } from "react-router-dom";
import { Building2, LayoutDashboard, ListChecks, UserCog, Users } from "lucide-react";
import { useAuthStore } from "../lib/auth-store";

const SHORTCUTS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Indicadores gerais" },
  { to: "/minha-empresa", label: "Minha Empresa", icon: Building2, hint: "Dados cadastrais" },
  { to: "/cadastros/estrutura/funcionarios", label: "Funcionários", icon: Users, hint: "Colaboradores da empresa" },
  { to: "/controle-vencimentos", label: "Vencimentos", icon: ListChecks, hint: "Documentos a vencer" },
  { to: "/usuarios", label: "Usuários", icon: UserCog, hint: "Acessos ao sistema" },
];

export function InicioPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wide text-teal-deep">ProtecOne</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Olá, {firstName}.</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {user?.company ? `Você está em ${user.company.name}.` : "Você tem acesso a todas as empresas."}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map(({ to, label, icon: Icon, hint }) => (
          <Link key={to} to={to} className="card flex items-start gap-3 transition-colors hover:bg-teal-tint/40">
            <span className="rounded-md bg-teal-tint p-2 text-teal-deep">
              <Icon size={18} />
            </span>
            <div>
              <p className="font-medium text-ink">{label}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
