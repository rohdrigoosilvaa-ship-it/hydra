import { MouseEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Company, Pgr } from "../lib/types";

const STATUS_LABEL: Record<Pgr["status"], string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  ARCHIVED: "Arquivado",
};
const STATUS_STYLE: Record<Pgr["status"], string> = {
  DRAFT: "bg-line text-ink-muted",
  IN_REVIEW: "bg-amber-tint text-amber",
  APPROVED: "bg-teal-tint text-teal-deep",
  ARCHIVED: "bg-line text-ink-muted",
};

export function PgrListPage() {
  const [pgrs, setPgrs] = useState<Pgr[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const navigate = useNavigate();
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    const pgrPath = selectedCompanyId
      ? `/pgr?companyId=${encodeURIComponent(selectedCompanyId)}`
      : "/pgr";
    const [pgrList, companyList] = await Promise.all([
      api.get<Pgr[]>(pgrPath),
      api.get<Company[]>("/companies"),
    ]);
    setPgrs(pgrList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  async function handleExcluir(e: MouseEvent, pgr: Pgr) {
    e.preventDefault();
    e.stopPropagation();
    const aviso =
      pgr.status === "APPROVED"
        ? `"${pgr.title}" está aprovado e é a versão vigente. Excluir mesmo assim?`
        : `Excluir o PGR "${pgr.title}"?`;
    if (!window.confirm(aviso)) return;
    await api.del(`/pgr/${pgr.id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">PGR</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany
              ? `Mostrando apenas PGRs de ${selectedCompany.name}.`
              : "Programa de Gerenciamento de Riscos — inventário e plano de ação por documento."}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => navigate(`/pgr/novo${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ""}`)}>
          <Plus size={15} /> Novo PGR
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pgrs === null && <p className="text-sm text-ink-muted">Carregando…</p>}
        {pgrs?.length === 0 && (
          <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted sm:col-span-2 xl:col-span-3">
            Nenhum PGR cadastrado ainda. Clique em “Novo PGR” para começar.
          </p>
        )}
        {pgrs?.map((pgr) => (
          <Link
            key={pgr.id}
            to={`/pgr/${pgr.id}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm transition-colors hover:border-teal"
          >
            <div className="h-1 bg-gradient-to-r from-teal to-teal-deep" />
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-tint text-teal-deep">
                    <ShieldCheck size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold text-ink">{pgr.title}</p>
                    {!selectedCompany && <p className="truncate text-xs text-ink-muted">{companyName(pgr.companyId)}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleExcluir(e, pgr)}
                  className="rounded-md p-1.5 text-ink-muted hover:bg-danger-tint hover:text-danger"
                  title="Excluir PGR"
                  aria-label={`Excluir ${pgr.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${STATUS_STYLE[pgr.status]}`}>{STATUS_LABEL[pgr.status]}</span>
                <span className="rounded-full bg-line px-2.5 py-1 font-mono text-ink-muted">v{pgr.version}</span>
                {pgr.code && <span className="rounded-full bg-line px-2.5 py-1 font-mono text-ink-muted">{pgr.code}</span>}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-paper px-3 py-2">
                  <p className="font-display text-xl font-semibold leading-none text-ink tabular-nums">{pgr._count?.risks ?? 0}</p>
                  <p className="mt-1 text-xs text-ink-muted">riscos</p>
                </div>
                <div className="rounded-lg bg-paper px-3 py-2">
                  <p className="font-display text-xl font-semibold leading-none text-ink tabular-nums">{pgr._count?.actions ?? 0}</p>
                  <p className="mt-1 text-xs text-ink-muted">ações</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
