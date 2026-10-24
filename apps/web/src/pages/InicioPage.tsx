import { useEffect, useState } from "react";
import {
  Boxes,
  Building2,
  Files,
  GraduationCap,
  HeartPulse,
  ListTodo,
  RefreshCw,
  ShieldCheck,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "../lib/auth-store";
import { api } from "../lib/api";
import type { ExecutiveSummary } from "../lib/types";

type Tone = "teal" | "amber" | "danger";

const TONE_BADGE: Record<Tone, string> = {
  teal: "bg-teal-tint text-teal-deep",
  amber: "bg-amber-tint text-amber",
  danger: "bg-danger-tint text-danger",
};

const nf = new Intl.NumberFormat("pt-BR");
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));

/** Início: boas-vindas e o dashboard da operação (empresas, vidas, GHE/cargos e indicadores). */
export function InicioPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(" ")[0] ?? "";
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setSummary(await api.get<ExecutiveSummary>("/dashboard/summary"));
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const headline: { label: string; value: string; icon: LucideIcon; hint?: string }[] = [
    { label: "Empresas Ativas", value: fmt(summary?.activeCompanies), icon: Building2 },
    { label: "Vidas Ativas", value: fmt(summary?.activeEmployees), icon: HeartPulse },
    {
      label: "GHE / Cargos",
      value: summary ? `${fmt(summary.ghes)} / ${fmt(summary.positions)}` : "—",
      icon: Boxes,
    },
  ];

  const indicators: { label: string; value: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "Conformidade", value: summary?.complianceRate == null ? "—" : `${summary.complianceRate}%`, icon: ShieldCheck, tone: "teal" },
    { label: "Incidentes (mês)", value: fmt(summary?.incidentsThisMonth), icon: Siren, tone: "danger" },
    { label: "Ações Pendentes", value: fmt(summary?.pendingActions), icon: ListTodo, tone: "amber" },
    { label: "Treinamentos a vencer", value: fmt(summary?.trainingsExpiringSoon), icon: GraduationCap, tone: "amber" },
    { label: "Documentos a vencer", value: fmt(summary?.documentsNeedingAttention), icon: Files, tone: "amber" },
    { label: "Riscos Críticos", value: fmt(summary?.criticalRisks), icon: TriangleAlert, tone: "danger" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-teal-deep">Bem-vindo ao Sistema ProtecOne</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Olá, {firstName}.</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {user?.company ? `Você está em ${user.company.name}.` : "Você tem acesso a todas as empresas."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Atualizando…" : "Atualizar dados"}
          </button>
          {summary && (
            <p className="font-mono text-[10px] text-ink-muted">
              Última atualização: {new Date(summary.generatedAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {headline.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-tint text-teal-deep">
              <Icon size={22} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-3xl font-semibold leading-none tabular-nums text-ink">{value}</p>
              <p className="mt-1.5 text-sm font-medium text-ink-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">Indicadores</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {indicators.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card flex flex-col gap-3 p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_BADGE[tone]}`}>
              <Icon size={17} strokeWidth={2} />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-ink">{value}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
