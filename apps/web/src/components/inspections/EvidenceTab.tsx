import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { api } from "../../lib/api";
import type { Evidence } from "../../lib/types";

const SOURCE_LABEL: Record<string, string> = {
  INSPECTION: "Inspeção",
  INSPECTION_ITEM_RESPONSE: "Item de inspeção",
  NON_CONFORMITY: "Não conformidade",
  BEHAVIOR_OBSERVATION: "Observação comportamental",
  OCCURRENCE: "Incidente",
  ACTION: "Plano de ação",
  AUDIT: "Auditoria",
  PGR: "PGR",
};

export function EvidenceTab({ companyId }: { companyId?: string }) {
  const [items, setItems] = useState<Evidence[] | null>(null);

  useEffect(() => {
    const path = companyId ? `/field-ops/evidence?companyId=${encodeURIComponent(companyId)}` : "/field-ops/evidence";
    api.get<Evidence[]>(path).then(setItems);
  }, [companyId]);

  if (items === null) return <p className="text-sm text-ink-muted">Carregando…</p>;

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <ImageIcon size={15} /> Nenhuma evidência registrada ainda — fotos anexadas em inspeções e não conformidades
        aparecem aqui.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((ev) => (
        <a
          key={ev.id}
          href={ev.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-lg border border-line bg-paper-raised"
        >
          <img src={ev.fileUrl} alt={ev.fileName} className="aspect-square w-full object-cover" />
          <p className="truncate px-2 py-1.5 text-[11px] text-ink-muted">{SOURCE_LABEL[ev.sourceType] ?? ev.sourceType}</p>
        </a>
      ))}
    </div>
  );
}
