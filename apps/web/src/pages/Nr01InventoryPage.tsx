import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Nr01InventoryRow, RiskCategory, RiskLevel } from "../lib/types";

const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: "Adequado",
  MEDIUM: "Moderado",
  HIGH: "Elevado",
  CRITICAL: "Crítico",
};
const RISK_LEVEL_STYLE: Record<RiskLevel, string> = {
  LOW: "bg-teal-tint text-teal-deep",
  MEDIUM: "bg-amber-tint text-amber",
  HIGH: "bg-amber-tint text-amber",
  CRITICAL: "bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] text-amber",
};
const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};

export function Nr01InventoryPage() {
  const [rows, setRows] = useState<Nr01InventoryRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | "">("");
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "">("");
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  useEffect(() => {
    const path = selectedCompanyId
      ? `/nr01/inventory?companyId=${encodeURIComponent(selectedCompanyId)}`
      : "/nr01/inventory";
    setRows(null);
    api.get<Nr01InventoryRow[]>(path).then(setRows);
  }, [selectedCompanyId]);

  const branches = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.branchName).filter((v): v is string => !!v))).sort(),
    [rows],
  );

  const filtered = (rows ?? []).filter((r) => {
    if (branchFilter && r.branchName !== branchFilter) return false;
    if (categoryFilter && r.hazardCategory !== categoryFilter) return false;
    if (levelFilter && r.riskLevel !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${r.hazardName} ${r.gheName} ${r.pgrTitle} ${r.companyName}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Inventário de Riscos</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Todos os riscos identificados nos PGRs, consolidados em uma única visão.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="input max-w-xs flex-1"
          placeholder="Buscar perigo, GHE, PGR ou empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input w-44" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="">Todas as unidades</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="input w-44"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as RiskCategory | "")}
        >
          <option value="">Todas as categorias</option>
          {(Object.keys(RISK_CATEGORY_LABEL) as RiskCategory[]).map((c) => (
            <option key={c} value={c}>
              {RISK_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select
          className="input w-40"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as RiskLevel | "")}
        >
          <option value="">Todos os níveis</option>
          {(Object.keys(RISK_LEVEL_LABEL) as RiskLevel[]).map((l) => (
            <option key={l} value={l}>
              {RISK_LEVEL_LABEL[l]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Processo (PGR)</th>
              <th className="px-4 py-3 font-medium">Atividade</th>
              <th className="px-4 py-3 font-medium">Fator de risco</th>
              <th className="px-4 py-3 font-medium">Grupo exposto</th>
              <th className="px-4 py-3 font-medium">Nível</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr>
                <td className="px-4 py-6 text-ink-muted" colSpan={7}>
                  Carregando…
                </td>
              </tr>
            )}
            {rows !== null && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-ink-muted" colSpan={7}>
                  Nenhum risco encontrado com os filtros atuais.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink-muted">{r.branchName ?? r.companyName}</td>
                <td className="px-4 py-3">
                  <Link to={`/pgr/${r.pgrId}`} className="text-teal-deep hover:underline">
                    {r.pgrTitle}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted">{r.gheName}</td>
                <td className="px-4 py-3 text-ink">{r.hazardName}</td>
                <td className="px-4 py-3 text-ink-muted">{r.gheName}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLE[r.riskLevel]}`}>
                    {RISK_LEVEL_LABEL[r.riskLevel]}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{r.classification ?? "A definir"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
