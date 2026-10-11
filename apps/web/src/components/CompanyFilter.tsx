import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { CompanySummary } from "../lib/types";

/**
 * Seletor global de empresa — vive no header, fora de qualquer rota, para que
 * a escolha persista ao navegar entre Dashboard, Minha Empresa e Colaboradores.
 */
export function CompanyFilter() {
  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const { selectedCompanyId, setSelectedCompanyId } = useCompanyFilterStore();

  useEffect(() => {
    api.get<CompanySummary[]>("/dashboard/companies").then((list) => {
      setCompanies(list);
      // se a empresa persistida foi excluída (ou nunca existiu), volta para "todas"
      if (selectedCompanyId && !list.some((c) => c.id === selectedCompanyId)) {
        setSelectedCompanyId(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!companies) return <div className="h-9 w-64" />;

  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      <Building2 size={15} />
      <select
        className="input"
        value={selectedCompanyId ?? ""}
        onChange={(e) => setSelectedCompanyId(e.target.value || null)}
      >
        <option value="">Todas as empresas</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.employeeCount} colab. · {c.lateActionsCount} ações atrasadas · {c.monthIncidentsCount} incid.
          </option>
        ))}
      </select>
    </label>
  );
}
