import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import type { Nr01Overview } from "../lib/types";

const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: "Adequado",
  MEDIUM: "Moderado",
  HIGH: "Elevado",
  CRITICAL: "Crítico",
  IRRELEVANT: "Irrelevante",
};
const RISK_LEVEL_BAR: Record<string, string> = {
  LOW: "bg-teal-deep",
  MEDIUM: "bg-amber",
  HIGH: "bg-amber",
  CRITICAL: "bg-[color-mix(in_srgb,var(--amber)_70%,black)]",
  IRRELEVANT: "bg-teal",
};
const ALERT_STYLE: Record<string, string> = {
  error: "border-amber bg-amber-tint text-amber",
  warning: "border-amber/50 bg-amber-tint/60 text-amber",
  info: "border-line bg-paper-raised text-ink-muted",
};
const PGR_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  APPROVED: "Ativo",
  ARCHIVED: "Arquivado",
};

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="card">
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Nr01OverviewPage() {
  const [data, setData] = useState<Nr01Overview | null>(null);

  useEffect(() => {
    api.get<Nr01Overview>("/nr01/overview").then(setData);
  }, []);

  if (!data) return <p className="text-sm text-ink-muted">Carregando…</p>;

  const totalByLevel = data.risks.byLevel;
  const riskTotal = data.risks.total || 1;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Visão Geral</h1>
      <p className="mt-1 text-sm text-ink-muted">Panorama do gerenciamento de riscos ocupacionais.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Riscos identificados" value={data.risks.total} />
        <StatCard label="Riscos avaliados" value={data.risks.evaluated} />
        <StatCard label="Riscos elevados" value={data.risks.elevated} />
        <StatCard label="Riscos críticos" value={data.risks.critical} />
        <StatCard label="Ações abertas" value={data.actions.open} />
        <StatCard label="Ações vencidas" value={data.actions.late} />
        <StatCard label="Ações concluídas" value={data.actions.done} />
        <StatCard
          label="Reavaliações pendentes"
          value={data.reevaluations.supported ? data.reevaluations.pending : "—"}
          hint={!data.reevaluations.supported ? "Recurso em desenvolvimento" : undefined}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-display text-sm font-semibold text-ink">Gerenciamento de Riscos Ocupacionais</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Distribuição dos riscos identificados por nível. Critérios de classificação configuráveis (em breve).
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            {(["IRRELEVANT", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((level) => {
              const count = totalByLevel[level];
              const pct = Math.round((count / riskTotal) * 100);
              return (
                <div key={level}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">{RISK_LEVEL_LABEL[level]}</span>
                    <span className="font-mono text-ink-muted">
                      {count} ({data.risks.total > 0 ? pct : 0}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${RISK_LEVEL_BAR[level]}`}
                      style={{ width: `${data.risks.total > 0 ? pct : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            {data.risks.total > 0 ? Math.round((data.risks.evaluated / data.risks.total) * 100) : 0}% dos riscos com
            avaliação concluída.
          </p>
          <Link to="/nr01/inventario" className="mt-3 inline-block text-xs font-medium text-teal-deep hover:underline">
            Ver Inventário de Riscos →
          </Link>
        </div>

        <div className="card">
          <h2 className="font-display text-sm font-semibold text-ink">Programa de Gerenciamento de Riscos</h2>
          {data.pgr.latest ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Status</p>
                <p className="text-ink">{PGR_STATUS_LABEL[data.pgr.latest.status]}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Versão</p>
                <p className="text-ink">v{data.pgr.latest.version}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Última atualização</p>
                <p className="text-ink">{new Date(data.pgr.latest.updatedAt).toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Vigência até</p>
                <p className="text-ink">
                  {data.pgr.latest.validUntil ? new Date(data.pgr.latest.validUntil).toLocaleDateString("pt-BR") : "Não informado"}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">PGRs cadastrados</p>
                <p className="text-ink">{data.pgr.count}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Ações pendentes</p>
                <p className="text-ink">{data.actions.open}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">Nenhum PGR cadastrado ainda.</p>
          )}
          <Link to="/pgr" className="mt-3 inline-block text-xs font-medium text-teal-deep hover:underline">
            Ver PGR →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-display text-sm font-semibold text-ink">Atenção necessária</h2>
          <div className="mt-3 flex flex-col gap-2">
            {data.alerts.length === 0 && <p className="text-sm text-ink-muted">Nenhum alerta no momento.</p>}
            {data.alerts.map((a, i) => (
              <Link
                key={i}
                to={a.message.includes("ação") ? "/acoes" : "/nr01/inventario"}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:opacity-80 ${ALERT_STYLE[a.severity]}`}
              >
                {a.severity === "error" ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
                {a.message}
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-sm font-semibold text-ink">Últimas atividades</h2>
          <div className="mt-3 flex flex-col gap-3">
            {data.activity.length === 0 && <p className="text-sm text-ink-muted">Nenhuma atividade recente.</p>}
            {data.activity.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Clock size={13} className="mt-0.5 shrink-0 text-ink-muted" />
                <div>
                  <p className="text-ink">{a.label}</p>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {new Date(a.at).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(a.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
