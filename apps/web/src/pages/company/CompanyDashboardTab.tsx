import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Activity, AlertTriangle, Boxes, FileEdit, FileHeart, HeartPulse, Radio, TrendingUp, UserX, type LucideIcon } from "lucide-react";
import { api } from "../../lib/api";
import { StatTile } from "../../components/ui/cards";
import type { CompanySummary } from "../../lib/types";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

const nf = new Intl.NumberFormat("pt-BR");

/** Dashboard e estatísticas da empresa. */
export function CompanyDashboardTab() {
  const { company, search } = useOutletContext<CompanyWorkspaceContext>();
  const [summary, setSummary] = useState<CompanySummary | null>(null);

  useEffect(() => {
    api.get<CompanySummary>(`/companies/${company.id}/summary`).then(setSummary).catch(() => setSummary(null));
  }, [company.id]);

  const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));
  const tiles: { label: string; value: string; icon: LucideIcon; tone?: "teal" | "amber" | "danger" | "neutral"; hint?: string }[] = [
    { label: "Cargos / GHE", value: summary ? `${fmt(summary.positions)} / ${fmt(summary.ghes)}` : "—", icon: Boxes },
    { label: "Vidas", value: fmt(summary?.lives), icon: HeartPulse, hint: summary?.contractedLives != null ? `${fmt(summary.contractedLives)} contratadas` : undefined },
    {
      label: "Vidas excedentes",
      value: fmt(summary?.excessLives),
      icon: TrendingUp,
      tone: (summary?.excessLives ?? 0) > 0 ? "amber" : "neutral",
      hint: summary && summary.contractedLives == null ? "Informe as vidas contratadas ao editar a empresa" : undefined,
    },
    { label: "Eventos eSocial", value: fmt(summary?.esocialEvents), icon: Radio },
    { label: "ASOs", value: fmt(summary?.asos), icon: FileHeart },
    { label: "CATs", value: fmt(summary?.cats), icon: AlertTriangle, tone: (summary?.cats ?? 0) > 0 ? "danger" : "neutral" },
    { label: "Funcionários afastados", value: fmt(summary?.absentEmployees), icon: UserX, tone: (summary?.absentEmployees ?? 0) > 0 ? "amber" : "neutral" },
    { label: "Docs em rascunho", value: fmt(summary?.draftDocuments), icon: FileEdit, tone: (summary?.draftDocuments ?? 0) > 0 ? "amber" : "neutral" },
  ];
  const q = search.trim().toLowerCase();
  const shown = tiles.filter((t) => !q || t.label.toLowerCase().includes(q));

  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Activity size={18} className="text-teal-deep" /> Dashboard e estatísticas
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shown.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} icon={t.icon} tone={t.tone ?? "teal"} hint={t.hint} />
        ))}
        {shown.length === 0 && <p className="text-sm text-ink-muted">Nenhum indicador encontrado para “{search}”.</p>}
      </div>
    </div>
  );
}
