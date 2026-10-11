import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Company, Employee, Ppp } from "../lib/types";

const STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", IN_REVIEW: "Em revisão", APPROVED: "Aprovado", ARCHIVED: "Arquivado" };
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-line text-ink-muted",
  IN_REVIEW: "bg-amber-tint text-amber",
  APPROVED: "bg-teal-tint text-teal-deep",
  ARCHIVED: "bg-line text-ink-muted",
};

export function PppPage() {
  const [ppps, setPpps] = useState<Ppp[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [pppList, employeeList, companyList] = await Promise.all([
      api.get<Ppp[]>("/ppp"),
      api.get<Employee[]>("/employees"),
      api.get<Company[]>("/companies"),
    ]);
    setPpps(pppList);
    setEmployees(employeeList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">PPP</h1>
          <p className="mt-1 text-sm text-ink-muted">Perfil Profissiográfico Previdenciário.</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo PPP
        </button>
      </div>

      {showForm && (
        <NewPppForm employees={employees} companies={companies} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Colaborador</th>
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ppps?.length === 0 && (
              <tr><td className="px-4 py-6 text-ink-muted" colSpan={3}>Nenhum PPP emitido ainda.</td></tr>
            )}
            {ppps?.map((p) => {
              const employeeName = employees.find((e) => e.id === p.employeeId)?.name ?? p.employeeId;
              return (
                <tr key={p.id} className="border-b border-line last:border-none">
                  <td className="px-4 py-3 text-ink">{employeeName}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">
                    {new Date(p.periodStart).toLocaleDateString("pt-BR")} – {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString("pt-BR") : "atual"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewPppForm({ employees, companies, onClose, onCreated }: { employees: Employee[]; companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/ppp", { employeeId, companyId, periodStart });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  if (employees.length === 0) {
    return <p className="mt-3 text-sm text-ink-muted">Cadastre um colaborador antes de emitir um PPP.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Colaborador</span>
        <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Início do período</span>
        <input type="date" className="input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
