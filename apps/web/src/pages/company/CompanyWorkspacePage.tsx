import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Pencil, Search } from "lucide-react";
import { api } from "../../lib/api";
import { useCompanyFilterStore } from "../../lib/company-filter-store";
import type { Company } from "../../lib/types";
import { CompanyForm } from "../CompanyPage";

export interface CompanyWorkspaceContext {
  company: Company;
  /** Texto da busca do topo — as telas filtram a lista com ele. */
  search: string;
}

const TOP_TABS = [
  { to: "mapeamento", label: "Mapeamento" },
  { to: "funcionarios", label: "Funcionários" },
  { to: "seguranca", label: "Segurança" },
  { to: "laudos", label: "Laudos" },
  { to: "saude", label: "Saúde" },
];

/** Painel de uma empresa: cabeçalho (logo, nome, editar, busca), abas do topo e a tela escolhida. */
export function CompanyWorkspacePage() {
  const { companyId = "" } = useParams();
  const setSelectedCompanyId = useCompanyFilterStore((s) => s.setSelectedCompanyId);
  const refreshCompanies = useCompanyFilterStore((s) => s.refreshCompanies);
  const [company, setCompany] = useState<Company | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      setCompany(await api.get<Company>(`/companies/${companyId}`));
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => {
    setCompany(null);
    load();
    // o resto do sistema passa a trabalhar com esta empresa selecionada
    setSelectedCompanyId(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  if (notFound) {
    return (
      <div>
        <p className="text-sm text-ink-muted">Empresa não encontrada.</p>
        <Link to="/empresas" className="mt-2 inline-block text-sm text-teal-deep hover:underline">Voltar para Empresas</Link>
      </div>
    );
  }
  if (!company) return <p className="text-sm text-ink-muted">Carregando…</p>;

  const context: CompanyWorkspaceContext = { company, search };

  return (
    <div>
      <Link to="/empresas" className="mb-3 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft size={13} /> Empresas
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="" className="h-12 w-12 rounded-lg border border-line bg-paper-raised object-contain p-1" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-tint text-teal-deep">
              <Building2 size={22} />
            </span>
          )}
          <h1 className="truncate font-display text-2xl font-semibold text-ink">{company.name}</h1>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Editar empresa"
            aria-label="Editar empresa"
            className="rounded-md p-1.5 text-ink-muted hover:bg-teal-tint hover:text-ink"
          >
            <Pencil size={16} />
          </button>
        </div>
        <label className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input w-full pl-9"
            placeholder="Buscar nesta empresa"
            aria-label="Buscar nesta empresa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {editing && (
        <CompanyForm
          company={company}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refreshCompanies();
            load();
          }}
          onLogoChanged={(updated) => {
            setCompany(updated);
            refreshCompanies();
          }}
        />
      )}

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções da empresa">
        {TOP_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            onClick={() => setSearch("")}
            className={({ isActive }) =>
              `shrink-0 border-b-2 px-4 py-2.5 font-display text-sm font-semibold transition-colors ${
                isActive ? "border-teal text-teal-deep" : "border-transparent text-ink-muted hover:text-ink"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5">
        <Outlet context={context} />
      </div>
    </div>
  );
}

