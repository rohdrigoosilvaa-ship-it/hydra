import { FormEvent, MouseEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
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
  const [showForm, setShowForm] = useState(false);
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
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo PGR
        </button>
      </div>

      {showForm && (
        <NewPgrForm
          companies={companies}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pgrs === null && <p className="text-sm text-ink-muted">Carregando…</p>}
        {pgrs?.length === 0 && (
          <p className="text-sm text-ink-muted">Nenhum PGR cadastrado ainda.</p>
        )}
        {pgrs?.map((pgr) => (
          <Link key={pgr.id} to={`/pgr/${pgr.id}`} className="card block hover:border-teal">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-ink">{pgr.title}</p>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[pgr.status]}`}>
                  {STATUS_LABEL[pgr.status]}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleExcluir(e, pgr)}
                  className="text-ink-muted hover:text-danger"
                  title="Excluir PGR"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {!selectedCompany && <p className="mt-1 text-xs text-ink-muted">{companyName(pgr.companyId)}</p>}
            <p className="mt-2 font-mono text-xs text-ink-muted">
              v{pgr.version} · {pgr._count?.risks ?? 0} riscos · {pgr._count?.actions ?? 0} ações
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewPgrForm({
  companies,
  defaultCompanyId,
  onClose,
  onCreated,
}: {
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/pgr", { title, companyId, code: code || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Título</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Código</span>
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex.: PGR-2026-001" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.length === 0 && <option value="">Cadastre uma empresa primeiro</option>}
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">
        {saving ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onClose} className="btn-secondary">
        Cancelar
      </button>
      {error && <p className="w-full text-sm text-amber">{error}</p>}
    </form>
  );
}
