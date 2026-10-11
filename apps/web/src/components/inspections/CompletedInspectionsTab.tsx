import { FormEvent, MouseEvent, useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, Pencil, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { EvidenceUploader } from "../EvidenceUploader";
import type { Company, Inspection, InspectionDetail, InspectionStatus } from "../../lib/types";

const STATUS_OPTIONS: InspectionStatus[] = ["EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"];
const STATUS_LABEL: Record<string, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída", CANCELADA: "Cancelada" };
const STATUS_STYLE: Record<string, string> = {
  EM_ANDAMENTO: "bg-amber-tint text-amber",
  CONCLUIDA: "bg-teal-tint text-teal-deep",
  CANCELADA: "bg-line text-ink-muted",
};
const VALUE_LABEL: Record<string, string> = { CONFORME: "Conforme", NAO_CONFORME: "Não conforme", NAO_APLICAVEL: "N/A" };
const VALUE_STYLE: Record<string, string> = {
  CONFORME: "text-teal-deep",
  NAO_CONFORME: "text-danger",
  NAO_APLICAVEL: "text-ink-muted",
};

export function CompletedInspectionsTab({ companyId }: { companyId?: string }) {
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function load() {
    const path = companyId ? `/field-ops/inspections?companyId=${encodeURIComponent(companyId)}` : "/field-ops/inspections";
    api.get<Inspection[]>(path).then(setInspections);
  }

  useEffect(load, [companyId]);
  useEffect(() => {
    api.get<Company[]>("/companies").then(setCompanies);
  }, []);

  function companyName(id: string) {
    return companies.find((c) => c.id === id)?.name ?? "—";
  }

  async function handleDelete(e: MouseEvent, inspection: Inspection) {
    e.stopPropagation();
    if (!window.confirm(`Excluir a inspeção "${inspection.template.name}"?`)) return;
    await api.del(`/field-ops/inspections/${inspection.id}`);
    load();
  }

  if (selectedId) {
    return (
      <InspectionDetailView
        id={selectedId}
        onBack={() => setSelectedId(null)}
        onDeleted={() => {
          setSelectedId(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
            <th className="px-4 py-3.5">Roteiro</th>
            {!companyId && <th className="px-4 py-3.5">Empresa</th>}
            <th className="px-4 py-3.5">Início</th>
            <th className="px-4 py-3.5">Respostas</th>
            <th className="px-4 py-3.5">Não conformidades</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5"></th>
          </tr>
        </thead>
        <tbody>
          {inspections?.length === 0 && (
            <tr><td className="px-4 py-8 text-center text-ink-muted" colSpan={companyId ? 6 : 7}>Nenhuma inspeção realizada ainda.</td></tr>
          )}
          {inspections?.map((i) => (
            <tr
              key={i.id}
              onClick={() => setSelectedId(i.id)}
              className="cursor-pointer border-t border-line transition-colors hover:bg-paper"
            >
              <td className="px-4 py-3.5 font-medium text-ink">{i.template.name}</td>
              {!companyId && <td className="px-4 py-3.5 text-ink-muted">{companyName(i.companyId)}</td>}
              <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                {new Date(i.startedAt).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3.5 text-ink-muted">{i._count?.responses ?? 0}</td>
              <td className="px-4 py-3.5 text-ink-muted">{i._count?.nonConformities ?? 0}</td>
              <td className="px-4 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[i.status]}`}>
                  {STATUS_LABEL[i.status]}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right">
                <button
                  onClick={(e) => handleDelete(e, i)}
                  className="flex items-center gap-1 text-xs text-amber hover:underline"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InspectionDetailView({
  id,
  onBack,
  onDeleted,
}: {
  id: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api.get<InspectionDetail>(`/field-ops/inspections/${id}`).then(setInspection);
  }, [id]);

  async function handleDelete() {
    if (!inspection) return;
    if (!window.confirm(`Excluir a inspeção "${inspection.template.name}"?`)) return;
    await api.del(`/field-ops/inspections/${id}`);
    onDeleted();
  }

  if (!inspection) return <p className="text-sm text-ink-muted">Carregando…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
          <ArrowLeft size={13} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1 text-xs text-teal-deep hover:underline"
          >
            <Pencil size={12} /> {editing ? "Fechar" : "Editar"}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1 text-xs text-amber hover:underline">
            <Trash2 size={12} /> Excluir
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-md bg-teal-tint p-2 text-teal-deep">
          <ClipboardCheck size={17} />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ink">{inspection.template.name}</p>
          <p className="text-xs text-ink-muted">
            {new Date(inspection.startedAt).toLocaleDateString("pt-BR")} · {STATUS_LABEL[inspection.status]}
          </p>
        </div>
      </div>

      {editing && (
        <InspectionEditForm
          inspection={inspection}
          onSaved={(updated) => {
            setInspection((prev) => (prev ? { ...prev, ...updated } : prev));
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}

      <div className="mt-4 flex flex-col gap-3">
        {inspection.template.items.map((item, index) => {
          const response = inspection.responses.find((r) => r.templateItemId === item.id);
          const previous = index > 0 ? inspection.template.items[index - 1] : null;
          const showBlockHeader = item.blockLabel && item.blockLabel !== previous?.blockLabel;
          const showCategoryHeader = item.category && (item.category !== previous?.category || showBlockHeader);
          return (
            <div key={item.id}>
              {showBlockHeader && (
                <p className="mb-2 mt-4 font-mono text-xs uppercase tracking-wide text-ink-muted first:mt-0">{item.blockLabel}</p>
              )}
              {showCategoryHeader && (
                <p className="mb-2 mt-3 text-sm font-semibold text-ink first:mt-0">{item.category}</p>
              )}
              <div className="card">
                <p className="font-medium text-ink">{item.text}</p>
                {response?.value && (
                  <p className={`mt-1 text-sm font-medium ${VALUE_STYLE[response.value]}`}>{VALUE_LABEL[response.value]}</p>
                )}
                {response?.textValue && (
                  <p className="mt-1 text-sm text-ink-muted">
                    {item.responseType === "SELECAO_MULTIPLA" ? response.textValue.split(",").join(", ") : response.textValue}
                  </p>
                )}
                {response?.comment && <p className="mt-1 text-sm text-ink-muted">{response.comment}</p>}
                {item.allowPhoto && (
                  <div className="mt-2">
                    <EvidenceUploader sourceType="INSPECTION_ITEM_RESPONSE" sourceId={`${inspection.id}:${item.id}`} companyId={inspection.companyId} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InspectionEditForm({
  inspection,
  onSaved,
  onClose,
}: {
  inspection: InspectionDetail;
  onSaved: (updated: { status: InspectionStatus; notes: string | null }) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<InspectionStatus>(inspection.status);
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/field-ops/inspections/${inspection.id}`, { status, notes: notes || undefined });
      onSaved({ status, notes: notes || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Status</span>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as InspectionStatus)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Observações</span>
        <textarea className="input min-h-[70px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary text-xs">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-xs">
          Cancelar
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}
