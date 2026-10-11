import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Absence, AbsenceType, Company, Employee, FapRecord } from "../lib/types";

const TYPE_LABEL: Record<AbsenceType, string> = {
  DOENCA: "Doença",
  MATERNIDADE: "Maternidade",
  ACIDENTE: "Acidente",
  OUTROS: "Outros",
};

export function PrevidenciarioPage() {
  const [absences, setAbsences] = useState<Absence[] | null>(null);
  const [fapRecords, setFapRecords] = useState<FapRecord[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [showFapForm, setShowFapForm] = useState(false);

  async function load() {
    const [absenceList, fapList, employeeList, companyList] = await Promise.all([
      api.get<Absence[]>("/previdenciario/absences"),
      api.get<FapRecord[]>("/previdenciario/fap"),
      api.get<Employee[]>("/employees"),
      api.get<Company[]>("/companies"),
    ]);
    setAbsences(absenceList);
    setFapRecords(fapList);
    setEmployees(employeeList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Previdenciário</h1>
      <p className="mt-1 text-sm text-ink-muted">Afastamentos e índices FAP/NTEP por empresa.</p>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Afastamentos</h2>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAbsenceForm(true)}>
            <Plus size={15} /> Novo afastamento
          </button>
        </div>
        {showAbsenceForm && (
          <NewAbsenceForm employees={employees} onClose={() => setShowAbsenceForm(false)} onCreated={() => { setShowAbsenceForm(false); load(); }} />
        )}
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-paper-raised">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Fim</th>
              </tr>
            </thead>
            <tbody>
              {absences?.length === 0 && (
                <tr><td className="px-4 py-6 text-ink-muted" colSpan={4}>Nenhum afastamento registrado ainda.</td></tr>
              )}
              {absences?.map((a) => {
                const employeeName = employees.find((e) => e.id === a.employeeId)?.name ?? a.employeeId;
                return (
                  <tr key={a.id} className="border-b border-line last:border-none">
                    <td className="px-4 py-3 text-ink">{employeeName}</td>
                    <td className="px-4 py-3 text-ink-muted">{TYPE_LABEL[a.type]}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{new Date(a.startDate).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{a.endDate ? new Date(a.endDate).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">FAP / NTEP</h2>
          <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={() => setShowFapForm(true)}>
            <Plus size={13} /> Novo índice
          </button>
        </div>
        {showFapForm && (
          <NewFapForm companies={companies} onClose={() => setShowFapForm(false)} onCreated={() => { setShowFapForm(false); load(); }} />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {fapRecords?.length === 0 && <p className="text-sm text-ink-muted">Nenhum índice cadastrado.</p>}
          {fapRecords?.map((f) => (
            <span key={f.id} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-ink">
              {f.year} · FAP {f.fapIndex.toFixed(4)} · NTEP {f.ntepCount}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function NewAbsenceForm({ employees, onClose, onCreated }: { employees: Employee[]; onClose: () => void; onCreated: () => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState<AbsenceType>("DOENCA");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/previdenciario/absences", { employeeId, type, startDate });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  if (employees.length === 0) {
    return <p className="mt-3 text-sm text-ink-muted">Cadastre um colaborador antes de registrar um afastamento.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Colaborador</span>
        <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Motivo</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as AbsenceType)}>
          {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Início</span>
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}

function NewFapForm({ companies, onClose, onCreated }: { companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [year, setYear] = useState(new Date().getFullYear());
  const [fapIndex, setFapIndex] = useState(1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/previdenciario/fap", { companyId, year, fapIndex });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Empresa</span>
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Ano</span>
        <input type="number" className="input w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Índice FAP</span>
        <input type="number" step="0.0001" className="input w-28" value={fapIndex} onChange={(e) => setFapIndex(Number(e.target.value))} required />
      </label>
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
