import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { ActionStatus, Company, PgrAction } from "../lib/types";

const STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  LATE: "Atrasada",
  VALIDATING: "Em validação",
  DONE: "Concluída",
  CANCELED: "Cancelada",
};
const STATUS_STYLE: Record<ActionStatus, string> = {
  OPEN: "bg-line text-ink-muted",
  IN_PROGRESS: "bg-teal-tint text-teal-deep",
  LATE: "bg-amber-tint text-amber",
  VALIDATING: "bg-amber-tint text-amber",
  DONE: "bg-teal-tint text-teal-deep",
  CANCELED: "bg-line text-ink-muted",
};

export function ActionsPage() {
  const [actions, setActions] = useState<PgrAction[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [actionList, companyList] = await Promise.all([
      api.get<PgrAction[]>("/actions"),
      api.get<Company[]>("/companies"),
    ]);
    setActions(actionList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(id: string, status: ActionStatus) {
    await api.patch(`/actions/${id}/status`, { status });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Plano de Ações</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Lista unificada — hoje alimentada pelo inventário de riscos do PGR e por ações avulsas.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nova ação
        </button>
      </div>

      {showForm && (
        <NewActionForm companies={companies} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Prazo</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {actions === null && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={4}>Carregando…</td></tr>
            )}
            {actions?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={4}>Nenhuma ação registrada ainda.</td></tr>
            )}
            {actions?.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink">{a.description}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {a.pgr?.title ?? (a.nonConformity ? "Inspeção" : "Avulsa")}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">
                  {a.dueDate ? new Date(a.dueDate).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={a.status}
                    onChange={(e) => handleStatusChange(a.id, e.target.value as ActionStatus)}
                    className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLE[a.status]}`}
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewActionForm({ companies, onClose, onCreated }: { companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/actions", { companyId, description, dueDate: dueDate || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (companies.length === 0) {
    return <p className="mt-4 text-sm text-ink-muted">Cadastre uma empresa antes de criar uma ação.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição</span>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Prazo</span>
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
