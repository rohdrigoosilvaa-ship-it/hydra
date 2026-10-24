import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, Boxes, FileEdit, FileHeart, HeartPulse, Radio, TrendingUp, UserX, type LucideIcon } from "lucide-react";
import { api } from "../../lib/api";
import { AreaChart, BarChart, Badge, BigNumber, DashCard, DashCardHeader } from "../../components/ui/dash";
import type { CompanySummary } from "../../lib/types";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

const nf = new Intl.NumberFormat("pt-BR");
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));
const sum = (points: { value: number }[] | undefined) => (points ?? []).reduce((total, p) => total + p.value, 0);

/** Dashboard e estatísticas da empresa. */
export function CompanyDashboardTab() {
  const { company, search } = useOutletContext<CompanyWorkspaceContext>();
  const [summary, setSummary] = useState<CompanySummary | null>(null);

  useEffect(() => {
    api.get<CompanySummary>(`/companies/${company.id}/summary`).then(setSummary).catch(() => setSummary(null));
  }, [company.id]);

  const empty = Array.from({ length: 6 }, () => ({ label: "", value: 0 }));
  const asos = summary?.asosByMonth ?? empty;
  const cats = summary?.catsByMonth ?? empty;

  const tiles: { label: string; value: string; icon: LucideIcon; tone: "teal" | "amber" | "danger" | "neutral"; hint?: string }[] = [
    { label: "Vidas excedentes", value: fmt(summary?.excessLives), icon: TrendingUp, tone: (summary?.excessLives ?? 0) > 0 ? "amber" : "neutral", hint: summary && summary.contractedLives == null ? "Informe as vidas contratadas ao editar a empresa" : undefined },
    { label: "Eventos eSocial", value: fmt(summary?.esocialEvents), icon: Radio, tone: "teal" },
    { label: "ASOs", value: fmt(summary?.asos), icon: FileHeart, tone: "teal" },
    { label: "CATs", value: fmt(summary?.cats), icon: AlertTriangle, tone: (summary?.cats ?? 0) > 0 ? "danger" : "neutral" },
    { label: "Funcionários afastados", value: fmt(summary?.absentEmployees), icon: UserX, tone: (summary?.absentEmployees ?? 0) > 0 ? "amber" : "neutral" },
    { label: "Docs em rascunho", value: fmt(summary?.draftDocuments), icon: FileEdit, tone: (summary?.draftDocuments ?? 0) > 0 ? "amber" : "neutral" },
  ];
  const TONE = { teal: "bg-teal-tint text-teal-deep", amber: "bg-amber-tint text-amber", danger: "bg-danger-tint text-danger", neutral: "bg-line text-ink-muted" };

  const q = search.trim().toLowerCase();
  if (q) {
    const found = [{ label: "Cargos / GHE", value: summary ? `${fmt(summary.positions)} / ${fmt(summary.ghes)}` : "—", icon: Boxes, tone: "teal" as const, hint: undefined }, { label: "Vidas", value: fmt(summary?.lives), icon: HeartPulse, tone: "teal" as const, hint: undefined }, ...tiles].filter((t) => t.label.toLowerCase().includes(q));
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {found.map((t) => (
          <DashCard key={t.label}>
            <p className="text-xs text-ink-muted">{t.label}</p>
            <BigNumber value={t.value} className="mt-2 text-3xl text-ink" />
          </DashCard>
        ))}
        {found.length === 0 && <p className="text-sm text-ink-muted">Nenhum indicador encontrado para “{search}”.</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-3">
        <section className="rounded-3xl bg-teal-deep p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium opacity-90">Vidas</p>
            <HeartPulse size={20} className="opacity-80" />
          </div>
          <BigNumber value={fmt(summary?.lives)} className="mt-5 text-5xl" />
          <p className="mt-6 text-xs opacity-75">
            {summary?.contractedLives != null ? `${fmt(summary.contractedLives)} vidas contratadas` : "Vidas contratadas não informadas"}
          </p>
        </section>
        <DashCard>
          <p className="text-xs text-ink-muted">Cargos / GHE</p>
          <div className="mt-1 flex items-center justify-between">
            <BigNumber value={summary ? fmt(summary.positions) : "—"} dim={summary ? ` / ${fmt(summary.ghes)}` : undefined} className="text-3xl text-ink" />
            <Boxes className="text-teal-deep" size={22} />
          </div>
        </DashCard>
      </div>

      <DashCard className="lg:col-span-6">
        <DashCardHeader title="ASOs emitidos" subtitle="Últimos 6 meses" right={<Badge>{sum(asos)} no período</Badge>} />
        <div className="mt-3">
          <BarChart data={asos} />
        </div>
      </DashCard>

      <DashCard className="lg:col-span-3">
        <DashCardHeader title="CATs" subtitle="Últimos 6 meses" />
        <BigNumber value={sum(cats)} dim=" no período" className="mt-3 text-3xl text-ink" />
        <div className="mt-2">
          <AreaChart data={cats} />
        </div>
      </DashCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:col-span-12">
        {tiles.map(({ label, value, icon: Icon, tone, hint }) => (
          <DashCard key={label} className="flex items-center gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${TONE[tone]}`}>
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <BigNumber value={value} className="text-2xl text-ink" />
              <p className="mt-1 text-xs text-ink-muted">{label}</p>
              {hint && <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>}
            </div>
          </DashCard>
        ))}
      </div>
    </div>
  );
}
