import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import type { PgrDetail } from "../../lib/types";

const FIELDS = [
  { key: "procedimentoTrabalho", label: "Procedimento de trabalho", hint: "Procedimentos e rotinas seguras recomendados para as atividades avaliadas." },
  { key: "treinamentosNecessarios", label: "Treinamentos necessários", hint: "Treinamentos e capacitações exigidos (NRs, integração, reciclagens)." },
  { key: "episRecomendados", label: "EPIs recomendados", hint: "Equipamentos de proteção individual recomendados, com CA quando houver." },
  { key: "metasPrioridades", label: "Metas e prioridades", hint: "Metas de redução de risco e ordem de prioridade das ações." },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

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
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-ink">Plano de Ações e Recomendações</h2>
      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">{f.label}</span>
          <span className="text-xs text-ink-muted">{f.hint}</span>
          <textarea
            className="input min-h-[110px] resize-y"
            value={values[f.key]}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [f.key]: e.target.value }));
              setSaved(false);
            }}
          />
        </label>
      ))}
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
