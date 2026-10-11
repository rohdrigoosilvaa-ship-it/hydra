import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Company, Ltcat } from "../lib/types";

const STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", IN_REVIEW: "Em revisão", APPROVED: "Aprovado", ARCHIVED: "Arquivado" };
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-line text-ink-muted",
  IN_REVIEW: "bg-amber-tint text-amber",
  APPROVED: "bg-teal-tint text-teal-deep",
  ARCHIVED: "bg-line text-ink-muted",
};

export function LtcatPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Ltcat[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const selectedCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);

  async function load() {
    const path = selectedCompanyId ? `/ltcat?companyId=${encodeURIComponent(selectedCompanyId)}` : "/ltcat";
    const [docList, companyList] = await Promise.all([
      api.get<Ltcat[]>(path),
      api.get<Company[]>("/companies"),
    ]);
    setDocs(docList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">LTCAT</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {selectedCompany
              ? `Mostrando apenas LTCATs de ${selectedCompany.name}.`
              : "Laudo Técnico das Condições Ambientais do Trabalho."}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo LTCAT
        </button>
      </div>

      {showForm && (
        <NewLtcatForm
          companies={companies}
          defaultCompanyId={selectedCompanyId ?? undefined}
          onClose={() => setShowForm(false)}
          onCreated={(id) => navigate(`/ltcat/${id}`)}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs === null && <p className="text-sm text-ink-muted">Carregando…</p>}
        {docs?.length === 0 && <p className="text-sm text-ink-muted">Nenhum LTCAT cadastrado ainda.</p>}
        {docs?.map((d) => (
          <Link key={d.id} to={`/ltcat/${d.id}`} className="card block hover:border-teal">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-ink">{d.title}</p>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[d.status]}`}>
                {STATUS_LABEL[d.status]}
              </span>
            </div>
            {!selectedCompany && <p className="mt-1 text-xs text-ink-muted">{companyName(d.companyId)}</p>}
            <p className="mt-2 font-mono text-xs text-ink-muted">
              v{d.version} · ART {d.artNumber ?? "—"} · {d._count?.agents ?? 0} agente(s)
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewLtcatForm({
  companies,
  defaultCompanyId,
  onClose,
  onCreated,
}: {
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [artNumber, setArtNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>("/ltcat", { title, companyId, artNumber: artNumber || undefined });
      onCreated(created.id);
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
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.length === 0 && <option value="">Cadastre uma empresa primeiro</option>}
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Nº da ART</span>
        <input className="input" value={artNumber} onChange={(e) => setArtNumber(e.target.value)} />
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      {error && <p className="w-full text-sm text-amber">{error}</p>}
    </form>
  );
}
