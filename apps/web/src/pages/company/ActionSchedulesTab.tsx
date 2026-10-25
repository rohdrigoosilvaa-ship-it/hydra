import { FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { X } from "lucide-react";
import { api } from "../../lib/api";
import { FormModal, ModalField } from "../../components/ui/modal";
import type { ActionSchedule, Company } from "../../lib/types";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";
import { ActionScheduleModal } from "./ActionScheduleModal";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-05-01" → "mai/2026" e o 12º mês a partir dele. */
function period(startMonth: string) {
  const y = Number(startMonth.slice(0, 4));
  const m = Number(startMonth.slice(5, 7)) - 1;
  const end = y * 12 + m + 11;
  return `${MONTHS[m]}/${y} - ${MONTHS[end % 12]}/${Math.floor(end / 12)}`;
}

/** Plano / Cronograma de Ações da empresa (aba Segurança). */
export function ActionSchedulesTab() {
  const { company } = useOutletContext<CompanyWorkspaceContext>();
  const [schedules, setSchedules] = useState<ActionSchedule[] | null>(null);
  const [form, setForm] = useState<ActionSchedule | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<ActionSchedule[]>(`/action-schedules?companyId=${company.id}`).then(setSchedules).catch(() => setSchedules([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  async function handleDelete(s: ActionSchedule) {
    if (!window.confirm(`Excluir o cronograma "${s.name}"?`)) return;
    setError(null);
    try {
      await api.del(`/action-schedules/${s.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  const link = "font-semibold text-teal-deep hover:underline";

  return (
    <div className="card">
      <h2 className="font-display text-lg uppercase tracking-wide text-ink">
        Plano / Cronograma de Ações{" "}
        <span className="text-base">
          [<button type="button" className={link} onClick={() => setForm("new")}>ADICIONAR</button>]{" "}
          [<button type="button" className={link} onClick={() => setImporting(true)}>IMPORTAR</button>]
        </span>
      </h2>
      {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink">
              <th className="px-3 py-3 font-semibold">Modo</th>
              <th className="px-3 py-3 font-semibold">Título</th>
              <th className="px-3 py-3 font-semibold">Autor</th>
              <th className="px-3 py-3 font-semibold">Cronograma</th>
              <th className="px-3 py-3 font-semibold">Tipo</th>
              <th className="px-3 py-3 text-right font-semibold">Opções</th>
            </tr>
          </thead>
          <tbody>
            {(schedules ?? []).map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-3 py-3 font-medium text-teal-deep">{s.mode === "DEFINED" ? "Versão Final" : "Rascunho"}</td>
                <td className="px-3 py-3 text-ink">{s.name}</td>
                <td className="px-3 py-3 text-ink">{s.author}</td>
                <td className="px-3 py-3 text-ink">{period(s.startMonth)}</td>
                <td className="px-3 py-3 text-ink">{s.type === "W5H2" ? "5W2H" : "Geral"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-end gap-1.5">
                    <button type="button" onClick={() => setForm(s)} aria-label={`Ver ${s.name}`} className="w-24 rounded-md bg-teal-deep px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                      {s.mode === "DEFINED" ? "Ver" : "Editar"}
                    </button>
                    <button type="button" onClick={() => handleDelete(s)} aria-label={`Excluir ${s.name}`} className="flex w-14 justify-center rounded-md bg-amber px-3 py-1.5 text-white hover:opacity-90">
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {schedules && schedules.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-muted">Nenhum cronograma foi cadastrado para esta empresa.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <ActionScheduleModal
          companyId={company.id}
          schedule={form === "new" ? undefined : form}
          history={schedules ?? []}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await load();
          }}
        />
      )}
      {importing && (
        <ImportScheduleModal
          companyId={company.id}
          onClose={() => setImporting(false)}
          onImported={async () => {
            setImporting(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

/** Copia um cronograma de outra empresa (ou desta) como rascunho. */
function ImportScheduleModal({ companyId, onClose, onImported }: { companyId: string; onClose: () => void; onImported: () => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sourceCompany, setSourceCompany] = useState(companyId);
  const [options, setOptions] = useState<ActionSchedule[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Company[]>("/companies").then(setCompanies).catch(() => setCompanies([]));
  }, []);
  useEffect(() => {
    setSourceId("");
    api.get<ActionSchedule[]>(`/action-schedules?companyId=${sourceCompany}`).then(setOptions).catch(() => setOptions([]));
  }, [sourceCompany]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/action-schedules/import", { sourceId, targetCompanyId: companyId });
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar.");
      setSaving(false);
    }
  }

  return (
    <FormModal title="Importar cronograma" onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={!!sourceId} error={error} size="max-w-xl">
      <ModalField label="Empresa de origem">
        <select className="input" aria-label="Empresa de origem" value={sourceCompany} onChange={(e) => setSourceCompany(e.target.value)}>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </ModalField>
      <ModalField label="Cronograma" required>
        <select className="input" aria-label="Cronograma" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">Escolha…</option>
          {options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </ModalField>
      <p className="text-xs text-ink-muted">A cópia entra como Rascunho, para você ajustar.</p>
    </FormModal>
  );
}
