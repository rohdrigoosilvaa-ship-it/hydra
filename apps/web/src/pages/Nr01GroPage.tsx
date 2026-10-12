import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Nr01Overview } from "../lib/types";

function Indicator({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-raised shadow-sm p-4">
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export function Nr01GroPage() {
  const [data, setData] = useState<Nr01Overview | null>(null);

  useEffect(() => {
    api.get<Nr01Overview>("/nr01/overview").then(setData);
  }, []);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Gerenciamento de Riscos Ocupacionais</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Controle todo o ciclo de gerenciamento de riscos: identificar → analisar → avaliar → controlar →
            monitorar → verificar eficácia → reavaliar. O risco é cadastrado dentro de um PGR e passa a ser
            monitorado aqui de forma centralizada.
          </p>
        </div>
        <Link to="/pgr" className="btn-primary flex shrink-0 items-center gap-1.5">
          <Plus size={15} /> Novo Risco
        </Link>
      </div>

      {!data && <p className="mt-6 text-sm text-ink-muted">Carregando…</p>}

      {data && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Indicator label="Riscos identificados" value={data.risks.total} />
          <Indicator label="Riscos avaliados" value={data.risks.evaluated} />
          <Indicator label="Riscos sem avaliação" value={data.risks.total - data.risks.evaluated} />
          <Indicator label="Riscos elevados" value={data.risks.elevated} />
          <Indicator label="Riscos críticos" value={data.risks.critical} />
          <Indicator label="Com medidas registradas" value={data.risks.withControls} />
          <Indicator label="Necessitam medida adicional" value={data.risks.needingControls} />
          <Indicator label="Ações abertas" value={data.actions.open} />
          <Indicator label="Ações vencidas" value={data.actions.late} />
          <Indicator label="Ações concluídas" value={data.actions.done} />
        </div>
      )}

      <div className="mt-8 rounded-xl border border-line bg-paper-raised shadow-sm p-5">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-wide text-ink-muted">Ciclo de gerenciamento</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          {["Identificar", "Analisar", "Avaliar", "Controlar", "Monitorar", "Verificar eficácia", "Reavaliar"].map(
            (step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-teal-deep px-3 py-1 text-xs font-medium text-teal-deep">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-line">→</span>}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link to="/nr01/inventario" className="text-teal-deep hover:underline">
          Ver Inventário de Riscos →
        </Link>
        <Link to="/pgr" className="text-teal-deep hover:underline">
          Ver PGR →
        </Link>
        <Link to="/acoes" className="text-teal-deep hover:underline">
          Ver Planos de Ação →
        </Link>
      </div>
    </div>
  );
}
