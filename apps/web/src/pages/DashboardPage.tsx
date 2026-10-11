import { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  Siren,
  ListTodo,
  GraduationCap,
  Files,
  TriangleAlert,
  Gavel,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "../lib/auth-store";
import { api } from "../lib/api";
import type { ExecutiveSummary } from "../lib/types";

type KpiTone = "teal" | "amber" | "danger" | "neutral";

const TONE_BADGE_STYLE: Record<KpiTone, string> = {
  teal: "bg-teal-tint text-teal-deep",
  amber: "bg-amber-tint text-amber",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-line text-ink-muted",
};

const KPI_CARDS: {
  key: keyof Omit<ExecutiveSummary, "generatedAt">;
  label: string;
  icon: typeof Users;
  tone: KpiTone;
  suffix?: string;
}[] = [
  { key: "employees", label: "Funcionários", icon: Users, tone: "teal" },
  { key: "complianceRate", label: "Conformidade", icon: ShieldCheck, tone: "teal", suffix: "%" },
  { key: "incidentsThisMonth", label: "Incidentes (mês)", icon: Siren, tone: "danger" },
  { key: "pendingActions", label: "Ações Pendentes", icon: ListTodo, tone: "amber" },
  { key: "trainingsExpiringSoon", label: "Treinamentos", icon: GraduationCap, tone: "amber" },
  { key: "documentsNeedingAttention", label: "Documentos", icon: Files, tone: "amber" },
  { key: "criticalRisks", label: "Riscos Críticos", icon: TriangleAlert, tone: "danger" },
  { key: "audits", label: "Auditorias", icon: Gavel, tone: "neutral" },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(" ")[0] ?? "";
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = await api.get<ExecutiveSummary>("/dashboard/summary");
    setSummary(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-teal-deep">ProtecOne Control Center</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Bom dia, {firstName}.</h1>
          <p className="mt-1 text-sm text-ink-muted">Visão geral da sua operação.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
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

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI_CARDS.map(({ key, label, icon: Icon, tone, suffix }) => {
          const raw = summary?.[key];
          const value = raw === null || raw === undefined ? "—" : `${raw}${suffix ?? ""}`;
          return (
            <div key={key} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_BADGE_STYLE[tone]}`}>
                  <Icon size={17} strokeWidth={2} />
                </span>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold tabular-nums text-ink">{summary ? value : "—"}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        "Auditorias" ainda não tem um módulo próprio — o card aparece aqui para reservar o lugar na visão executiva.
      </p>
    </div>
  );
}
