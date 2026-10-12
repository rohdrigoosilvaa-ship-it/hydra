import { FormEvent, useState } from "react";
import { ClipboardList, GraduationCap, HardHat, Target, type LucideIcon } from "lucide-react";
import { api } from "../../lib/api";
import type { PgrDetail } from "../../lib/types";

const FIELDS: { key: string; label: string; hint: string; icon: LucideIcon }[] = [
  { key: "procedimentoTrabalho", label: "Procedimento de trabalho", hint: "Procedimentos e rotinas seguras recomendados para as atividades avaliadas.", icon: ClipboardList },
  { key: "treinamentosNecessarios", label: "Treinamentos necessários", hint: "Treinamentos e capacitações exigidos (NRs, integração, reciclagens).", icon: GraduationCap },
  { key: "episRecomendados", label: "EPIs recomendados", hint: "Equipamentos de proteção individual recomendados, com CA quando houver.", icon: HardHat },
  { key: "metasPrioridades", label: "Metas e prioridades", hint: "Metas de redução de risco e ordem de prioridade das ações.", icon: Target },
];

type FieldKey = "procedimentoTrabalho" | "treinamentosNecessarios" | "episRecomendados" | "metasPrioridades";

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
  );
}
