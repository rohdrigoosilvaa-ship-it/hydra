import { FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormModal, ModalField } from "../components/ui/modal";
import type { CompanyWorkspaceContext } from "./company/CompanyWorkspacePage";
import { api } from "../lib/api";
import type { Company, Employee, ExamType, MedicalExam, Pcmso, Position } from "../lib/types";

interface ControlRow {
  employeeId: string;
  employeeName: string;
  positionName: string | null;
  exam: string;
  periodicityMonths: number;
  origin: string | null;
  lastPerformedAt: string | null;
  nextDueAt: string | null;
  status: "EM_DIA" | "VENCENDO" | "VENCIDO" | "SEM_REGISTRO";
}
const CONTROL_LABEL: Record<ControlRow["status"], string> = { EM_DIA: "Em dia", VENCENDO: "Vence em breve", VENCIDO: "Vencido", SEM_REGISTRO: "Sem registro" };
const CONTROL_STYLE: Record<ControlRow["status"], string> = {
  EM_DIA: "bg-teal-tint text-teal-deep",
  VENCENDO: "bg-amber-tint text-amber",
  VENCIDO: "bg-amber text-white",
  SEM_REGISTRO: "bg-line text-ink-muted",
};

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

const plusOneYear = (iso: string) => `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}`;
const fmt = (iso?: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export function HealthPage() {
  // dentro da empresa (Saúde › Saúde Ocupacional) mostra só os colaboradores e exames dela
  const workspace = useOutletContext<CompanyWorkspaceContext | undefined>();
  const filterCompanyId = useCompanyFilterStore((s) => s.selectedCompanyId);
  // empresa da tela da empresa ou, fora dela, a empresa escolhida no filtro do topo
  const companyId = workspace?.company?.id ?? filterCompanyId ?? undefined;
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pcmsos, setPcmsos] = useState<Pcmso[] | null>(null);
  const [exams, setExams] = useState<MedicalExam[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [control, setControl] = useState<ControlRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showPcmsoForm, setShowPcmsoForm] = useState(false);
  const [examForm, setExamForm] = useState<MedicalExam | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const q = companyId ? `?companyId=${companyId}` : "";
    const [pcmsoList, examList, employeeList, companyList, positionList, controlList] = await Promise.all([
      api.get<Pcmso[]>("/health/pcmso"),
      api.get<MedicalExam[]>(`/health/exams${q}`),
      api.get<Employee[]>(`/employees${q}`),
      api.get<Company[]>("/companies"),
      api.get<Position[]>(`/positions${q}`),
      companyId ? api.get<ControlRow[]>(`/health/exams/control?companyId=${companyId}`) : Promise.resolve([] as ControlRow[]),
    ]);
    setPositions(positionList);
    setControl(controlList);
    setPcmsos(companyId ? pcmsoList.filter((p) => p.companyId === companyId) : pcmsoList);
    setExams(examList);
    setEmployees(employeeList);
    setCompanies(companyList);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleSync() {
    if (!companyId) return;
    if (!window.confirm("Lançar o exame admissional de todos os colaboradores desta empresa que têm data de admissão? O vencimento de cada um fica 1 ano depois da admissão.")) return;
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const r = await api.post<{ created: number; withoutAdmission: number }>("/health/exams/sync-admissions", { companyId });
      setSyncMessage(
        `${r.created} exame(s) admissional(is) lançado(s)` +
          (r.withoutAdmission ? ` · ${r.withoutAdmission} colaborador(es) sem data de admissão cadastrada` : "") +
          ". Confirme o resultado de cada um (Editar) para virar ASO emitido.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao puxar os exames.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(exam: MedicalExam, name: string) {
    if (!window.confirm(`Excluir o exame ${EXAM_TYPE_LABEL[exam.type].toLowerCase()} de ${name}?`)) return;
    setError(null);
    try {
      await api.del(`/health/exams/${exam.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Saúde Ocupacional</h1>
      <p className="mt-1 text-sm text-ink-muted">PCMSO, exames e resultados (ASO). Exame com resultado Apto ou Inapto entra nos ASOs emitidos do painel da empresa. Vencimento: 1 ano depois do exame (no admissional, 1 ano após a admissão).</p>

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
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={handleSync}
              disabled={!companyId || syncing}
              title={companyId ? "Lança o exame admissional de cada colaborador pela data de admissão" : "Escolha uma empresa no filtro do topo"}
            >
              {syncing ? "Puxando…" : "Puxar exames da admissão"}
            </button>
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setExamForm("new")}>
              <Plus size={15} /> Lançar exame
            </button>
          </div>
        </div>
        {syncMessage && <p className="mt-3 rounded-md border-l-2 border-teal bg-teal-tint px-3 py-2 text-sm" role="status">{syncMessage}</p>}
        {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}
        <div className="mt-3 panel">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Data do exame</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
                <th className="px-4 py-3 font-medium">Próximo vencimento</th>
                <th className="px-4 py-3 text-right font-medium">Opções</th>
              </tr>
            </thead>
            <tbody>
              {exams?.length === 0 && (
                <tr><td className="px-4 py-6 text-ink-muted" colSpan={6}>Nenhum exame lançado ainda.</td></tr>
              )}
              {exams?.map((e) => {
                const employeeName = employees.find((emp) => emp.id === e.employeeId)?.name ?? e.employeeId;
                return (
                  <tr key={e.id} className="border-b border-line last:border-none">
                    <td className="px-4 py-3 text-ink">{employeeName}</td>
                    <td className="px-4 py-3 text-ink-muted">{EXAM_TYPE_LABEL[e.type]}</td>
                    <td className="px-4 py-3 text-ink">{fmt(e.performedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${RESULT_STYLE[e.result]}`}>
                        {RESULT_LABEL[e.result]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {fmt(e.nextDueAt)} <DueBadge iso={e.nextDueAt} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" aria-label={`Editar exame de ${employeeName}`} title="Editar" onClick={() => setExamForm(e)} className="rounded-md bg-teal-deep p-2 text-white hover:opacity-90"><Pencil size={14} /></button>
                        <button type="button" aria-label={`Excluir exame de ${employeeName}`} title="Excluir" onClick={() => handleDelete(e, employeeName)} className="rounded-md bg-amber p-2 text-white hover:opacity-90"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {companyId && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-ink">Controle de exames por colaborador</h2>
          <p className="mt-1 text-sm text-ink-muted">Os exames vêm do cargo: os que os riscos do PGR exigem e os que foram lançados no cargo. O vencimento segue a periodicidade de cada exame.</p>
          <div className="mt-3 panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Exame</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Último</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {control.length === 0 && (
                  <tr><td className="px-4 py-6 text-ink-muted" colSpan={7}>Nenhum exame exigido pelos cargos dos colaboradores. Defina os exames no risco (Segurança › Riscos) ou no cargo.</td></tr>
                )}
                {control.map((r) => (
                  <tr key={`${r.employeeId}-${r.exam}`} className="border-b border-line last:border-none">
                    <td className="px-4 py-3 text-ink">{r.employeeName}</td>
                    <td className="px-4 py-3 text-ink-muted">{r.positionName ?? "—"}</td>
                    <td className="px-4 py-3 text-ink">{r.exam} <span className="text-xs text-ink-muted">(a cada {r.periodicityMonths}m)</span></td>
                    <td className="px-4 py-3 text-ink-muted">{r.origin ?? "Cargo"}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmt(r.lastPerformedAt)}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmt(r.nextDueAt)}</td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${CONTROL_STYLE[r.status]}`}>{CONTROL_LABEL[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {examForm && (
        <ExamModal
          employees={employees}
          positions={positions}
          exam={examForm === "new" ? undefined : examForm}
          onClose={() => setExamForm(null)}
          onSaved={() => {
            setExamForm(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Vencido ou vencendo nos próximos 30 dias. */
function DueBadge({ iso }: { iso?: string | null }) {
  if (!iso) return null;
  const days = Math.floor((new Date(iso.slice(0, 10)).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return <span className="ml-1 rounded bg-amber-tint px-1.5 py-0.5 text-[11px] font-semibold text-amber">Vencido</span>;
  if (days <= 30) return <span className="ml-1 rounded bg-amber-tint px-1.5 py-0.5 text-[11px] font-semibold text-amber">Vence em {days}d</span>;
  return null;
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

/** Lançar / editar exame: colaborador, tipo, data do exame, resultado e próximo vencimento. */
function ExamModal({ employees, positions, exam, onClose, onSaved }: { employees: Employee[]; positions: Position[]; exam?: MedicalExam; onClose: () => void; onSaved: () => void }) {
  const [employeeId, setEmployeeId] = useState(exam?.employeeId ?? employees[0]?.id ?? "");
  const [type, setType] = useState<ExamType>(exam?.type ?? "PERIODICO");
  const [performedAt, setPerformedAt] = useState(exam?.performedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<"APTO" | "INAPTO" | "PENDENTE">(exam?.result ?? "APTO");
  const [nextDueAt, setNextDueAt] = useState(exam?.nextDueAt?.slice(0, 10) ?? plusOneYear(exam?.performedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)));
  const [dueTouched, setDueTouched] = useState(!!exam?.nextDueAt);
  const required = positions.find((p) => p.id === employees.find((x) => x.id === employeeId)?.positionId)?.exams ?? [];
  // exames do cargo marcados por padrão; ao editar, os que já estavam no exame
  const [picked, setPicked] = useState<string[] | null>(exam ? (exam.items ?? []).map((i) => i.name) : null);
  const selected = picked ?? required.map((r) => r.name);
  const togglePick = (name: string) => setPicked(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const items = selected.map((name) => ({ name }));
    try {
      if (exam) {
        await api.patch(`/health/exams/${exam.id}`, { type, performedAt: performedAt || null, result, nextDueAt: nextDueAt || null, items });
      } else {
        await api.post("/health/exams", { employeeId, type, performedAt: performedAt || undefined, result, nextDueAt: nextDueAt || undefined, items });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  return (
    <FormModal title={exam ? "Editar exame" : "Lançar exame"} onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={!!employeeId} error={error} size="max-w-2xl">
      {employees.length === 0 && <p className="text-sm text-ink-muted">Cadastre um colaborador antes de lançar um exame.</p>}
      <ModalField label="Colaborador" required>
        <select className="input" aria-label="Colaborador" disabled={!!exam} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
      </ModalField>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ModalField label="Tipo do exame">
          <select className="input" aria-label="Tipo do exame" value={type} onChange={(e) => setType(e.target.value as ExamType)}>
            {Object.entries(EXAM_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </ModalField>
        <ModalField label="Data do exame">
          <input
            className="input"
            type="date"
            aria-label="Data do exame"
            value={performedAt}
            onChange={(e) => {
              setPerformedAt(e.target.value);
              // vencimento padrão: 1 ano depois do exame, enquanto não for mudado à mão
              if (!dueTouched && e.target.value) setNextDueAt(plusOneYear(e.target.value));
            }}
          />
        </ModalField>
        <ModalField label="Resultado">
          <select className="input" aria-label="Resultado" value={result} onChange={(e) => setResult(e.target.value as "APTO" | "INAPTO" | "PENDENTE")}>
            <option value="APTO">Apto</option>
            <option value="INAPTO">Inapto</option>
            <option value="PENDENTE">Pendente</option>
          </select>
        </ModalField>
        <ModalField label="Próximo vencimento">
          <input className="input" type="date" aria-label="Próximo vencimento" value={nextDueAt} onChange={(e) => { setNextDueAt(e.target.value); setDueTouched(true); }} />
        </ModalField>
      </div>
      {required.length > 0 && (
        <fieldset className="rounded-md border border-line p-3">
          <legend className="px-1 text-xs font-semibold uppercase text-teal-deep">Exames do cargo feitos neste atendimento</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {required.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={selected.includes(r.name)} onChange={() => togglePick(r.name)} />
                {r.name} <span className="text-xs text-ink-muted">(a cada {r.periodicityMonths}m)</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Cada exame marcado vence conforme a periodicidade dele, contada a partir da data do exame.</p>
        </fieldset>
      )}
      <p className="text-xs text-ink-muted">O vencimento sugerido é 1 ano depois do exame. Com resultado Apto ou Inapto, o exame conta como ASO emitido no painel da empresa.</p>
    </FormModal>
  );
}
