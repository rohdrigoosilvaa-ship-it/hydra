import { FormEvent, useEffect, useState } from "react";
import { ClipboardList, GraduationCap, HardHat, Target, type LucideIcon } from "lucide-react";
import { api } from "../../lib/api";
import type { ActionSchedule, PgrDetail } from "../../lib/types";
import { ActionScheduleModal } from "../../pages/company/ActionScheduleModal";

const FIELDS: { key: string; label: string; hint: string; icon: LucideIcon }[] = [
  { key: "procedimentoTrabalho", label: "Procedimento de trabalho", hint: "Procedimentos e rotinas seguras recomendados para as atividades avaliadas.", icon: ClipboardList },
  { key: "treinamentosNecessarios", label: "Treinamentos necessários", hint: "Treinamentos e capacitações exigidos (NRs, integração, reciclagens).", icon: GraduationCap },
  { key: "episRecomendados", label: "EPIs recomendados", hint: "Equipamentos de proteção individual recomendados, com CA quando houver.", icon: HardHat },
  { key: "metasPrioridades", label: "Metas e prioridades", hint: "Metas de redução de risco e ordem de prioridade das ações.", icon: Target },
];

type FieldKey = "procedimentoTrabalho" | "treinamentosNecessarios" | "episRecomendados" | "metasPrioridades";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function period(startMonth: string) {
  const y = Number(startMonth.slice(0, 4));
  const m = Number(startMonth.slice(5, 7)) - 1;
  const end = y * 12 + m + 11;
  return `${MONTHS[m]}/${y} - ${MONTHS[end % 12]}/${Math.floor(end / 12)}`;
}

/** Planos / cronogramas de ação da empresa: os mesmos da aba Segurança da empresa; os marcados entram no PGR. */
function SchedulesSection({ pgr, onChanged }: { pgr: PgrDetail; onChanged: () => void }) {
  const [schedules, setSchedules] = useState<ActionSchedule[] | null>(null);
  const [form, setForm] = useState<ActionSchedule | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const included = pgr.scheduleIds ?? [];

  const load = () => api.get<ActionSchedule[]>(`/action-schedules?companyId=${pgr.companyId}`).then(setSchedules).catch(() => setSchedules([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgr.companyId]);

  async function setIncluded(ids: string[]) {
    setError(null);
    try {
      await api.patch(`/pgr/${pgr.id}`, { scheduleIds: ids });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    }
  }
  const toggle = (id: string) => setIncluded(included.includes(id) ? included.filter((x) => x !== id) : [...included, id]);

  const link = "font-semibold text-teal-deep hover:underline";
  return (
    <section className="card">
      <h2 className="font-display text-lg uppercase tracking-wide text-ink">
        Plano / Cronograma de Ações{" "}
        <span className="text-base">[<button type="button" className={link} onClick={() => setForm("new")}>ADICIONAR</button>]</span>
      </h2>
      <p className="mt-1 text-sm text-ink-muted">Os mesmos planos da empresa (Segurança › Plano / Cronograma de Ações). Os marcados entram neste PGR e no PDF.</p>
      {error && <p className="mt-2 text-sm text-amber" role="alert">{error}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink">
              <th className="px-3 py-2 font-semibold">No PGR</th>
              <th className="px-3 py-2 font-semibold">Modo</th>
              <th className="px-3 py-2 font-semibold">Título</th>
              <th className="px-3 py-2 font-semibold">Autor</th>
              <th className="px-3 py-2 font-semibold">Cronograma</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 text-right font-semibold">Opções</th>
            </tr>
          </thead>
          <tbody>
            {(schedules ?? []).map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <input type="checkbox" aria-label={`Incluir ${s.name} no PGR`} checked={included.includes(s.id)} onChange={() => toggle(s.id)} />
                </td>
                <td className="px-3 py-2 font-medium text-teal-deep">{s.mode === "DEFINED" ? "Versão Final" : "Rascunho"}</td>
                <td className="px-3 py-2 text-ink">{s.name}</td>
                <td className="px-3 py-2 text-ink">{s.author}</td>
                <td className="px-3 py-2 text-ink">{period(s.startMonth)}</td>
                <td className="px-3 py-2 text-ink">{s.type === "W5H2" ? "5W2H" : "Geral"}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => setForm(s)} aria-label={`Abrir ${s.name}`} className="rounded-md bg-teal-deep px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                    {s.mode === "DEFINED" ? "Ver" : "Editar"}
                  </button>
                </td>
              </tr>
            ))}
            {schedules && schedules.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-ink-muted">Nenhum plano / cronograma cadastrado para esta empresa.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {form && (
        <ActionScheduleModal
          companyId={pgr.companyId}
          schedule={form === "new" ? undefined : form}
          history={schedules ?? []}
          onClose={() => setForm(null)}
          onSaved={async (saved) => {
            setForm(null);
            // plano criado aqui já entra no PGR
            if (saved && form === "new") await setIncluded([...included, saved.id]);
            await load();
          }}
        />
      )}
    </section>
  );
}

export function PgrPlanoAcoesTab({ pgr, onChanged }: { pgr: PgrDetail; onChanged: () => void }) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    procedimentoTrabalho: pgr.procedimentoTrabalho ?? "",
    treinamentosNecessarios: pgr.treinamentosNecessarios ?? "",
    episRecomendados: pgr.episRecomendados ?? "",
    metasPrioridades: pgr.metasPrioridades ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch(`/pgr/${pgr.id}`, values);
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
    <SchedulesSection pgr={pgr} onChanged={onChanged} />
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Plano de ações e recomendações</h2>
        <p className="mt-0.5 text-sm text-ink-muted">Quatro quadros que compõem o plano — preencha o que se aplica a esta empresa.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {FIELDS.map((f) => {
          const Icon = f.icon;
          const key = f.key as FieldKey;
          return (
            <label key={f.key} className="flex flex-col overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
              <span className="h-1 bg-gradient-to-r from-teal to-teal-deep" />
              <span className="flex items-start gap-3 px-4 pt-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-tint text-teal-deep">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block font-display text-sm font-semibold text-ink">{f.label}</span>
                  <span className="block text-xs text-ink-muted">{f.hint}</span>
                </span>
              </span>
              <textarea
                className="input m-4 min-h-[140px] resize-y"
                value={values[key]}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [key]: e.target.value }));
                  setSaved(false);
                }}
              />
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        {saved && <p className="text-sm text-teal-deep">Salvo.</p>}
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
    </div>
  );
}