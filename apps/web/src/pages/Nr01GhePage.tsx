import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Nr01GheListItem } from "../lib/types";

export function Nr01GhePage() {
  const [ghes, setGhes] = useState<Nr01GheListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  useEffect(() => {
    const path = selectedCompanyId ? `/nr01/ghe?companyId=${encodeURIComponent(selectedCompanyId)}` : "/nr01/ghe";
    setGhes(null);
    api.get<Nr01GheListItem[]>(path).then(setGhes);
  }, [selectedCompanyId]);

  const filtered = useMemo(() => {
    if (!search) return ghes ?? [];
    const q = search.toLowerCase();
    return (ghes ?? []).filter((g) =>
      `${g.name} ${g.code ?? ""} ${g.companyName} ${g.pgrTitle}`.toLowerCase().includes(q),
    );
  }, [ghes, search]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">GHE — Grupos Homogêneos de Exposição</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Grupos cadastrados nos PGRs da empresa, com funções vinculadas e riscos identificados.
      </p>

      <div className="mt-4">
        <input
          className="input max-w-xs"
          placeholder="Buscar GHE, código, empresa ou PGR…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ghes === null && <p className="text-sm text-ink-muted">Carregando…</p>}
        {ghes !== null && filtered.length === 0 && (
          <p className="text-sm text-ink-muted">Nenhum GHE encontrado com os filtros atuais.</p>
        )}
        {filtered.map((g) => (
          <Link
            key={g.id}
            to={`/pgr/${g.pgrId}`}
            className="flex flex-col gap-2 rounded-xl border border-line bg-paper-raised shadow-sm p-4 transition hover:border-teal-deep/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Boxes size={16} className="text-teal-deep" />
                <p className="font-medium text-ink">{g.name}</p>
              </div>
              {g.code && <span className="rounded bg-paper px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">{g.code}</span>}
            </div>
            {g.activityDescription && <p className="text-xs text-ink-muted line-clamp-2">{g.activityDescription}</p>}
            <div className="mt-1 flex items-center justify-between text-xs text-ink-muted">
              <span>{g.companyName}</span>
              <span>{g.pgrTitle}</span>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-line pt-2 text-xs">
              <span className="text-ink-muted">{g.employeesCount} colaborador(es)</span>
              <span className="text-ink-muted">{g.functionsCount} função(ões)</span>
              <span className="text-ink-muted">{g.risksCount} risco(s)</span>
              {g.criticalRisksCount > 0 && (
                <span className="font-medium text-amber">{g.criticalRisksCount} crítico(s)</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
