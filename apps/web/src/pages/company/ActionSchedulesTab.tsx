import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { ActionSchedule } from "../../lib/types";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";
import { ActionScheduleModal, monthLabel } from "./ActionScheduleModal";

/** Plano / Cronograma de Ações da empresa (aba Segurança). */
export function ActionSchedulesTab() {
  const { company } = useOutletContext<CompanyWorkspaceContext>();
  const [schedules, setSchedules] = useState<ActionSchedule[] | null>(null);
  const [form, setForm] = useState<ActionSchedule | "new" | null>(null);
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Plano / Cronograma de Ações</h2>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setForm("new")}>
          <Plus size={15} /> Adicionar
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}

      {schedules && schedules.length === 0 && (
        <div className="card mt-4 py-10 text-center text-sm text-ink-muted">Nenhum cronograma foi cadastrado para esta empresa.</div>
      )}

      {schedules && schedules.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => setForm(s)} className="min-w-0 text-left" title="Abrir cronograma">
                  <p className="truncate font-medium text-ink hover:underline">{s.name}</p>
                  <p className="text-xs text-ink-muted">Autor: {s.author}</p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-semibold">
                  <span className="rounded bg-teal-tint px-2 py-0.5 text-teal-deep">{s.type === "W5H2" ? "5W2H" : "Geral"}</span>
                  <span className={`rounded px-2 py-0.5 ${s.mode === "DEFINED" ? "bg-teal-deep text-white" : "bg-amber-tint text-amber"}`}>
                    {s.mode === "DEFINED" ? "Definido" : "Rascunho"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {s.items.length} ação(ões) · início {monthLabel(s.startMonth.slice(0, 7))} · elaborado em {s.elaboratedAt.slice(0, 10).split("-").reverse().join("/")}
              </p>
              <div className="mt-3 flex gap-3 border-t border-line pt-3">
                <button onClick={() => setForm(s)} className="flex items-center gap-1.5 text-xs text-teal-deep hover:underline">
                  <Pencil size={12} /> {s.mode === "DEFINED" ? "Abrir" : "Editar"}
                </button>
                <button onClick={() => handleDelete(s)} className="flex items-center gap-1.5 text-xs text-amber hover:underline">
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
