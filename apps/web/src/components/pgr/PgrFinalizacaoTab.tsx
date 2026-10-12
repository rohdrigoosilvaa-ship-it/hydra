import { FormEvent, useState } from "react";
import { FlagTriangleRight, Paperclip } from "lucide-react";
import { api } from "../../lib/api";
import { EvidenceUploader } from "../EvidenceUploader";
import type { PgrDetail } from "../../lib/types";
import { SectionCard } from "./pgr-shared";

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
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="Considerações finais" subtitle="Texto de encerramento que vai ao final do PGR." icon={FlagTriangleRight}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            className="input min-h-[200px] resize-y"
            aria-label="Considerações finais"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? "Salvando…" : "Salvar"}
            </button>
            {saved && <p className="text-sm text-teal-deep">Salvo.</p>}
            {error && <p className="text-sm text-amber">{error}</p>}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Anexos"
        subtitle="Certificados de calibração, ART, termos e definições, inventário de EPIs etc. (imagens ou digitalizações). Entram como anexos no PDF."
        icon={Paperclip}
      >
        <EvidenceUploader sourceType="PGR" sourceId={pgr.id} companyId={pgr.companyId} />
      </SectionCard>
    </div>
  );
}
