import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { EvidenceUploader } from "../EvidenceUploader";
import type { PgrDetail } from "../../lib/types";

export function PgrFinalizacaoTab({ pgr, onChanged }: { pgr: PgrDetail; onChanged: () => void }) {
  const [text, setText] = useState(pgr.consideracoesFinais ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch(`/pgr/${pgr.id}`, { consideracoesFinais: text });
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h2 className="font-display text-lg font-semibold text-ink">Finalização</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Considerações finais</span>
          <textarea
            className="input min-h-[130px] resize-y"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {saved && <p className="text-sm text-teal-deep">Salvo.</p>}
          {error && <p className="text-sm text-amber">{error}</p>}
        </div>
      </form>

      <div>
        <p className="font-medium text-ink">Anexos</p>
        <p className="mb-3 text-xs text-ink-muted">
          Certificados de calibração, ART, termos e definições, inventário de EPIs etc. (imagens ou digitalizações). Entram
          como anexos no PDF.
        </p>
        <EvidenceUploader sourceType="PGR" sourceId={pgr.id} companyId={pgr.companyId} />
      </div>
    </div>
  );
}
