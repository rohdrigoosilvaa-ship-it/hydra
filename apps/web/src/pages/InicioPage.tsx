import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Building2, HeartPulse, RefreshCw, ShieldCheck, Siren, TriangleAlert } from "lucide-react";
import { useAuthStore } from "../lib/auth-store";
import { api } from "../lib/api";
import { AreaChart, BarChart, Badge, BigNumber, DashCard, DashCardHeader } from "../components/ui/dash";
import type { ExecutiveSummary, Pendencia } from "../lib/types";

const nf = new Intl.NumberFormat("pt-BR");
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));
const sum = (points: { value: number }[] | undefined) => (points ?? []).reduce((total, p) => total + p.value, 0);

/** Início: boas-vindas e o dashboard da operação. */
export function InicioPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(" ")[0] ?? "";
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [s, p] = await Promise.all([
      api.get<ExecutiveSummary>("/dashboard/summary"),
      api.get<Pendencia[]>("/pendencias").catch(() => [] as Pendencia[]),
    ]);
    setSummary(s);
    setPendencias(p);
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

  const empty = Array.from({ length: 6 }, () => ({ label: "", value: 0 }));
  const asos = summary?.asosByMonth ?? empty;
  const incidents = summary?.incidentsByMonth ?? empty;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Bem-vindo de volta, <span className="font-medium text-ink-muted">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {user?.company ? `Você está em ${user.company.name}.` : "Você tem acesso a todas as empresas."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-full border border-line bg-paper-raised px-4 py-2.5 text-sm font-medium text-ink shadow-sm hover:bg-teal-tint">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Atualizando…" : "Atualizar dados"}
          </button>
          {summary && <p className="font-mono text-[10px] text-ink-muted">Atualizado em {new Date(summary.generatedAt).toLocaleString("pt-BR")}</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* coluna da esquerda: vidas (cartão verde) e conformidade */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <section className="rounded-3xl bg-teal-deep p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium opacity-90">Vidas ativas</p>
              <HeartPulse size={20} className="opacity-80" />
            </div>
            <BigNumber value={fmt(summary?.activeEmployees)} className="mt-5 text-5xl" />
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="opacity-70">Empresas ativas</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-semibold"><Building2 size={14} />{fmt(summary?.activeCompanies)}</p>
              </div>
              <div>
                <p className="opacity-70">GHE / Cargos</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-semibold"><Boxes size={14} />{summary ? `${fmt(summary.ghes)} / ${fmt(summary.positions)}` : "—"}</p>
              </div>
            </div>
          </section>
          <DashCard>
            <p className="text-xs text-ink-muted">Conformidade</p>
            <div className="mt-1 flex items-center justify-between">
              <BigNumber value={summary?.complianceRate == null ? "—" : summary.complianceRate} dim={summary?.complianceRate == null ? undefined : "%"} className="text-3xl text-ink" />
              <ShieldCheck className="text-teal-deep" size={22} />
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">Documentos de colaboradores em dia</p>
          </DashCard>
        </div>

        {/* centro: gráfico de barras */}
        <DashCard className="lg:col-span-6">
          <DashCardHeader title="ASOs emitidos" subtitle="Últimos 6 meses" to="/saude" right={<Badge>{sum(asos)} no período</Badge>} />
          <div className="mt-3">
            <BarChart data={asos} />
          </div>
        </DashCard>

        {/* direita: incidentes e ações */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <DashCard>
            <DashCardHeader title="Incidentes" subtitle="Últimos 6 meses" to="/incidentes" />
            <BigNumber value={sum(incidents)} dim=" no período" className="mt-3 text-3xl text-ink" />
            <div className="mt-2">
              <AreaChart data={incidents} />
            </div>
          </DashCard>
          <DashCard>
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted">Ações pendentes</p>
              <Badge tone={(summary?.pendingActions ?? 0) > 0 ? "amber" : "neutral"}>{(summary?.pendingActions ?? 0) > 0 ? "Atenção" : "Em dia"}</Badge>
            </div>
            <BigNumber value={fmt(summary?.pendingActions)} className="mt-2 text-3xl text-ink" />
          </DashCard>
        </div>

        {/* embaixo: pendências e alertas */}
        <DashCard className="lg:col-span-9">
          <DashCardHeader title="Central de pendências" subtitle="O que precisa de atenção agora" to="/pendencias" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-ink-muted">
                  <th className="py-2 pr-3 font-medium">Pendência</th>
                  <th className="py-2 pr-3 font-medium">Origem</th>
                  <th className="py-2 pr-3 font-medium">Unidade</th>
                  <th className="py-2 pr-3 font-medium">Prazo</th>
                  <th className="py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {pendencias && pendencias.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-ink-muted">Nenhuma pendência no momento.</td></tr>
                )}
                {(pendencias ?? []).slice(0, 5).map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-3 pr-3 font-medium text-ink"><Link to={p.link} className="hover:underline">{p.titulo}</Link></td>
                    <td className="py-3 pr-3 text-ink-muted">{p.origem}</td>
                    <td className="py-3 pr-3 text-ink-muted">{p.unidade ?? "—"}</td>
                    <td className="py-3 pr-3 text-ink-muted">{p.prazo ? new Date(p.prazo).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="py-3"><Badge tone={p.criticidade === "alta" ? "danger" : "amber"}>{p.criticidade === "alta" ? "Alta" : "Média"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashCard>

        <DashCard className="lg:col-span-3">
          <DashCardHeader title="Alertas" subtitle="Vencimentos e riscos" />
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {[
              { label: "Treinamentos a vencer", value: summary?.trainingsExpiringSoon, icon: ShieldCheck },
              { label: "Documentos a vencer", value: summary?.documentsNeedingAttention, icon: TriangleAlert },
              { label: "Riscos críticos", value: summary?.criticalRisks, icon: Siren },
            ].map(({ label, value, icon: Icon }) => (
              <li key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-3 py-2.5">
                <span className="flex items-center gap-2 text-ink-muted"><Icon size={15} className="text-teal-deep" />{label}</span>
                <span className="font-display text-lg font-semibold tabular-nums text-ink">{fmt(value)}</span>
              </li>
            ))}
          </ul>
        </DashCard>
      </div>
    </div>
  );
}
