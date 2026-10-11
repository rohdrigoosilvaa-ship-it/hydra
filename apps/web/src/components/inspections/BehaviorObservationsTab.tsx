import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../../lib/api";
import { EvidenceUploader } from "../EvidenceUploader";
import type { BehaviorObservation, BehaviorObservationCategory } from "../../lib/types";

const CATEGORY_LABEL: Record<BehaviorObservationCategory, string> = {
  ATO_SEGURO: "Ato seguro",
  ATO_INSEGURO: "Ato inseguro",
  CONDICAO_SEGURA: "Condição segura",
  CONDICAO_INSEGURA: "Condição insegura",
};
const CATEGORY_STYLE: Record<BehaviorObservationCategory, string> = {
  ATO_SEGURO: "bg-teal-tint text-teal-deep",
  CONDICAO_SEGURA: "bg-teal-tint text-teal-deep",
  ATO_INSEGURO: "bg-danger-tint text-danger",
  CONDICAO_INSEGURA: "bg-danger-tint text-danger",
};

export function BehaviorObservationsTab({ companyId }: { companyId?: string }) {
  const [items, setItems] = useState<BehaviorObservation[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    const path = companyId
      ? `/field-ops/behavior-observations?companyId=${encodeURIComponent(companyId)}`
      : "/field-ops/behavior-observations";
    setItems(await api.get<BehaviorObservation[]>(path));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Registro de observações comportamentais de segurança — atos e condições, seguras ou inseguras.
        </p>
        <button
          className="btn-primary flex items-center gap-1.5 text-sm"
          onClick={() => setShowForm(true)}
          disabled={!companyId}
        >
          <Plus size={15} /> Nova observação
        </button>
      </div>
      {!companyId && <p className="mt-2 text-xs text-amber">Selecione uma empresa no filtro do topo.</p>}

      {showForm && companyId && (
        <NewObservationForm
          companyId={companyId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="mt-4 flex flex-col gap-2">
        {items?.length === 0 && <p className="text-sm text-ink-muted">Nenhuma observação registrada ainda.</p>}
        {items?.map((o) => (
          <div key={o.id} className="card">
            <button
              className="flex w-full items-start justify-between gap-2 text-left"
              onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
            >
              <div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLE[o.category]}`}>
                  {CATEGORY_LABEL[o.category]}
                </span>
                <p className="mt-1.5 text-sm text-ink">{o.description}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-ink-muted">
                {new Date(o.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </button>
            {expandedId === o.id && (
              <div className="mt-3 border-t border-line pt-3">
                {o.actionTaken && (
                  <p className="text-sm text-ink-muted">
                    <span className="font-medium text-ink">Ação tomada: </span>
                    {o.actionTaken}
                  </p>
                )}
                <div className="mt-2">
                  <EvidenceUploader sourceType="BEHAVIOR_OBSERVATION" sourceId={o.id} companyId={o.companyId} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewObservationForm({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [category, setCategory] = useState<BehaviorObservationCategory>("ATO_INSEGURO");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/field-ops/behavior-observations", {
        companyId,
        category,
        description,
        actionTaken: actionTaken || undefined,
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Categoria</span>
        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value as BehaviorObservationCategory)}
        >
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">O que foi observado</span>
        <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Ação tomada (opcional)</span>
        <textarea className="input" rows={2} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !description} className="btn-primary">
          {saving ? "Salvando…" : "Salvar observação"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}
