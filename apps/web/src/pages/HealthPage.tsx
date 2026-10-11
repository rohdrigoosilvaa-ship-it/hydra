import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Company, Employee, ExamType, MedicalExam, Pcmso } from "../lib/types";

const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  ADMISSIONAL: "Admissional",
  PERIODICO: "Periódico",
  DEMISSIONAL: "Demissional",
  RETORNO_TRABALHO: "Retorno ao trabalho",
  MUDANCA_RISCO: "Mudança de risco",
};
const RESULT_STYLE: Record<string, string> = {
  APTO: "bg-teal-tint text-teal-deep",
  INAPTO: "bg-amber-tint text-amber",
  PENDENTE: "bg-line text-ink-muted",
};
const RESULT_LABEL: Record<string, string> = { APTO: "Apto", INAPTO: "Inapto", PENDENTE: "Pendente" };

export function HealthPage() {
  const [pcmsos, setPcmsos] = useState<Pcmso[] | null>(null);
  const [exams, setExams] = useState<MedicalExam[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showPcmsoForm, setShowPcmsoForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);

  async function load() {
    const [pcmsoList, examList, employeeList, companyList] = await Promise.all([
      api.get<Pcmso[]>("/health/pcmso"),
      api.get<MedicalExam[]>("/health/exams"),
      api.get<Employee[]>("/employees"),
      api.get<Company[]>("/companies"),
    ]);
    setPcmsos(pcmsoList);
    setExams(examList);
    setEmployees(employeeList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Saúde Ocupacional</h1>
      <p className="mt-1 text-sm text-ink-muted">PCMSO, exames e resultados (ASO).</p>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">PCMSO</h2>
          <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={() => setShowPcmsoForm(true)}>
            <Plus size={13} /> Novo PCMSO
          </button>
        </div>
        {showPcmsoForm && (
          <NewPcmsoForm companies={companies} onClose={() => setShowPcmsoForm(false)} onCreated={() => { setShowPcmsoForm(false); load(); }} />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {pcmsos?.length === 0 && <p className="text-sm text-ink-muted">Nenhum PCMSO cadastrado.</p>}
          {pcmsos?.map((p) => (
            <span key={p.id} className="rounded-full border border-line px-3 py-1 text-xs text-ink">
              {p.title} · v{p.version}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Exames</h2>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowExamForm(true)}>
            <Plus size={15} /> Novo exame
          </button>
        </div>
        {showExamForm && (
          <NewExamForm employees={employees} onClose={() => setShowExamForm(false)} onCreated={() => { setShowExamForm(false); load(); }} />
        )}
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-paper-raised">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {exams?.length === 0 && (
                <tr><td className="px-4 py-6 text-ink-muted" colSpan={3}>Nenhum exame registrado ainda.</td></tr>
              )}
              {exams?.map((e) => {
                const employeeName = employees.find((emp) => emp.id === e.employeeId)?.name ?? e.employeeId;
                return (
                  <tr key={e.id} className="border-b border-line last:border-none">
                    <td className="px-4 py-3 text-ink">{employeeName}</td>
                    <td className="px-4 py-3 text-ink-muted">{EXAM_TYPE_LABEL[e.type]}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${RESULT_STYLE[e.result]}`}>
                        {RESULT_LABEL[e.result]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function NewPcmsoForm({ companies, onClose, onCreated }: { companies: Company[]; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/health/pcmso", { title, companyId });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-wrap items-end gap-3">
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
      <button type="submit" disabled={saving || !companyId} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}

function NewExamForm({ employees, onClose, onCreated }: { employees: Employee[]; onClose: () => void; onCreated: () => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState<ExamType>("ADMISSIONAL");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/health/exams", { employeeId, type });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  if (employees.length === 0) {
    return <p className="mt-3 text-sm text-ink-muted">Cadastre um colaborador antes de registrar um exame.</p>;
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
        <span className="text-ink-muted">Tipo</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as ExamType)}>
          {Object.entries(EXAM_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
      <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
    </form>
  );
}
