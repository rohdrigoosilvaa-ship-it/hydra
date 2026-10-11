import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { CipaTerm, Company } from "../lib/types";

const STATUS_LABEL: Record<string, string> = { PLANNED: "Planejado", ACTIVE: "Ativo", CLOSED: "Encerrado" };
const STATUS_STYLE: Record<string, string> = {
  PLANNED: "bg-line text-ink-muted",
  ACTIVE: "bg-teal-tint text-teal-deep",
  CLOSED: "bg-line text-ink-muted",
};

export function CipaPage() {
  const [terms, setTerms] = useState<CipaTerm[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [termList, companyList] = await Promise.all([
      api.get<CipaTerm[]>("/cipa/terms"),
      api.get<Company[]>("/companies"),
    ]);
    setTerms(termList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">CIPA</h1>
          <p className="mt-1 text-sm text-ink-muted">Mandatos e membros.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo mandato
        </button>
      </div>

      {showForm && (
        <NewTermForm companies={companies} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {terms?.length === 0 && <p className="text-sm text-ink-muted">Nenhum mandato cadastrado ainda.</p>}
        {terms?.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-xs text-ink-muted">
                {new Date(t.startDate).toLocaleDateString("pt-BR")} – {new Date(t.endDate).toLocaleDateString("pt-BR")}
              </p>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{t.members.length} membro(s)</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewTermForm({ companies, onClose, onCreated }: { companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/cipa/terms", { companyId, startDate, endDate });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Início</span>
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Fim</span>
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
