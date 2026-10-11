import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Company, TechnicalReport, TechnicalReportType } from "../lib/types";

const TYPE_LABEL: Record<TechnicalReportType, string> = {
  INSALUBRIDADE: "Insalubridade",
  PERICULOSIDADE: "Periculosidade",
  COMPLEMENTAR: "Complementar",
  PARECER: "Parecer técnico",
  ERGONOMICO: "Laudo Ergonômico",
};
const STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", IN_REVIEW: "Em revisão", APPROVED: "Aprovado", ARCHIVED: "Arquivado" };
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-line text-ink-muted",
  IN_REVIEW: "bg-amber-tint text-amber",
  APPROVED: "bg-teal-tint text-teal-deep",
  ARCHIVED: "bg-line text-ink-muted",
};

export function ReportsPage() {
  const [reports, setReports] = useState<TechnicalReport[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [reportList, companyList] = await Promise.all([
      api.get<TechnicalReport[]>("/laudos"),
      api.get<Company[]>("/companies"),
    ]);
    setReports(reportList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Laudos</h1>
          <p className="mt-1 text-sm text-ink-muted">Insalubridade, periculosidade e pareceres técnicos.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo laudo
        </button>
      </div>

      {showForm && (
        <NewReportForm companies={companies} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={3}>Nenhum laudo cadastrado ainda.</td></tr>
            )}
            {reports?.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink">{r.title}</td>
                <td className="px-4 py-3 text-ink-muted">{TYPE_LABEL[r.type]}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewReportForm({ companies, onClose, onCreated }: { companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [type, setType] = useState<TechnicalReportType>("INSALUBRIDADE");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/laudos", { title, companyId, type });
      onCreated();
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
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Tipo</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as TechnicalReportType)}>
          {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
