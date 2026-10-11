import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../../lib/api";
import type { EpiCatalogItem, PositionRequiredEpi } from "../../lib/types";

const CUSTOM_OPTION = "__custom__";

export function PositionRequiredEpisModal({
  positionId,
  positionName,
  onClose,
}: {
  positionId: string;
  positionName: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<PositionRequiredEpi[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PositionRequiredEpi | null>(null);

  async function load() {
    setItems(await api.get<PositionRequiredEpi[]>(`/positions/${positionId}/required-epis`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

  async function handleRemove(item: PositionRequiredEpi) {
    if (!window.confirm(`Remover "${item.catalogItem?.name ?? item.epiName}" dos EPIs exigidos deste cargo?`)) return;
    await api.del(`/positions/${positionId}/required-epis/${item.id}`);
    load();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">EPIs exigidos</h3>
            <p className="text-xs text-ink-muted">{positionName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-paper text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2">EPI</th>
                <th className="px-3 py-2">CA</th>
                <th className="px-3 py-2">Periodicidade</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items === null && (
                <tr><td className="px-3 py-4 text-center text-ink-muted" colSpan={4}>Carregando…</td></tr>
              )}
              {items?.length === 0 && (
                <tr><td className="px-3 py-4 text-center text-ink-muted" colSpan={4}>Nenhum EPI exigido cadastrado ainda.</td></tr>
              )}
              {items?.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-2 text-ink">{item.catalogItem?.name ?? item.epiName}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-muted">{item.ca ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-ink-muted">
                    {item.periodicityMonths ? `${item.periodicityMonths} ${item.periodicityMonths === 1 ? "mês" : "meses"}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(item)} className="text-ink-muted hover:text-teal-deep">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleRemove(item)} className="text-ink-muted hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-secondary mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Plus size={13} /> Novo EPI exigido
        </button>

        {(showForm || editing) && (
          <RequiredEpiForm
            positionId={positionId}
            item={editing ?? undefined}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function RequiredEpiForm({
  positionId,
  item,
  onClose,
  onSaved,
}: {
  positionId: string;
  item?: PositionRequiredEpi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!item;
  const [catalog, setCatalog] = useState<EpiCatalogItem[]>([]);
  const [selected, setSelected] = useState(item ? item.epiCatalogItemId ?? CUSTOM_OPTION : "");
  const [customName, setCustomName] = useState(item && !item.epiCatalogItemId ? item.epiName : "");
  const [ca, setCa] = useState(item?.ca ?? "");
  const [periodicityMonths, setPeriodicityMonths] = useState(item?.periodicityMonths?.toString() ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<EpiCatalogItem[]>("/epi/catalog").then(setCatalog);
  }, []);

  const groupedByCategory = catalog.reduce<Record<string, EpiCatalogItem[]>>((acc, catalogItem) => {
    (acc[catalogItem.category] ??= []).push(catalogItem);
    return acc;
  }, {});

  async function handleSubmit() {
    const catalogItem = catalog.find((c) => c.id === selected);
    const epiName = selected === CUSTOM_OPTION ? customName.trim() : catalogItem?.name ?? "";
    if (!epiName) {
      setError("Selecione um EPI ou digite o nome.");
      return;
    }
    setSaving(true);
    setError(null);
    const periodicity = periodicityMonths ? parseInt(periodicityMonths, 10) : undefined;
    try {
      if (isEditing) {
        await api.patch(`/positions/${positionId}/required-epis/${item!.id}`, {
          epiCatalogItemId: selected === CUSTOM_OPTION ? null : selected || null,
          epiName,
          ca: ca || null,
          periodicityMonths: periodicity ?? null,
          notes: notes || null,
        });
      } else {
        await api.post(`/positions/${positionId}/required-epis`, {
          epiCatalogItemId: selected === CUSTOM_OPTION ? undefined : selected || undefined,
          epiName,
          ca: ca || undefined,
          periodicityMonths: periodicity,
          notes: notes || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-base font-semibold text-ink">{isEditing ? "Editar EPI exigido" : "Novo EPI exigido"}</h3>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">EPI</span>
            <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Selecione um EPI</option>
              {Object.entries(groupedByCategory).map(([category, catalogItems]) => (
                <optgroup key={category} label={category}>
                  {catalogItems.map((catalogItem) => (
                    <option key={catalogItem.id} value={catalogItem.id}>{catalogItem.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value={CUSTOM_OPTION}>Outro (digitar)…</option>
            </select>
          </label>

          {selected === CUSTOM_OPTION && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Nome do EPI</span>
              <input className="input" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">CA do EPI</span>
            <input className="input" value={ca} onChange={(e) => setCa(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Periodicidade preventiva para troca (meses)</span>
            <input
              type="number"
              min={1}
              className="input"
              placeholder="Ex.: 6"
              value={periodicityMonths}
              onChange={(e) => setPeriodicityMonths(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Observação</span>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        {error && <p className="mt-2 text-xs text-amber">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
