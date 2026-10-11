import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api } from "../../lib/api";
import type { Department, Ghe, GheFunction, Nr01GheListItem, PgrDetail, Position } from "../../lib/types";
import { AiSuggestButton, Field } from "./pgr-shared";

export function PgrGheTab({
  pgr,
  departments,
  positions,
  onChanged,
}: {
  pgr: PgrDetail;
  departments: Department[];
  positions: Position[];
  onChanged: () => void;
}) {
  const [showGheForm, setShowGheForm] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          Grupos Homogêneos de Exposição (GHE)
        </h2>
        <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={() => setShowGheForm(true)}>
          <Plus size={13} /> Novo GHE
        </button>
      </div>
      {showGheForm && (
        <NewGheForm
          pgrId={pgr.id}
          companyId={pgr.companyId}
          onClose={() => setShowGheForm(false)}
          onCreated={() => {
            setShowGheForm(false);
            onChanged();
          }}
        />
      )}
      <div className="mt-3 flex flex-col gap-3">
        {pgr.ghes.length === 0 && <p className="text-sm text-ink-muted">Nenhum GHE cadastrado.</p>}
        {pgr.ghes.map((g) => (
          <GheCard key={g.id} ghe={g} departments={departments} positions={positions} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function NewGheForm({
  pgrId,
  companyId,
  onClose,
  onCreated,
}: {
  pgrId: string;
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [existingGhes, setExistingGhes] = useState<Nr01GheListItem[]>([]);
  const [copyFromId, setCopyFromId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Nr01GheListItem[]>(`/nr01/ghe?companyId=${encodeURIComponent(companyId)}`).then(setExistingGhes);
  }, [companyId]);

  function handleCopyFrom(gheId: string) {
    setCopyFromId(gheId);
    const source = existingGhes.find((g) => g.id === gheId);
    if (!source) return;
    setName(source.name);
    setCode(source.code ?? "");
    setLocalDescription(source.localDescription ?? "");
    setActivityDescription(source.activityDescription ?? "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/pgr/ghe", {
        pgrId,
        name,
        code: code || undefined,
        localDescription: localDescription || undefined,
        activityDescription: activityDescription || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-col gap-3">
      {existingGhes.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Copiar dados de um GHE existente (opcional)</span>
          <select className="input" value={copyFromId} onChange={(e) => handleCopyFrom(e.target.value)}>
            <option value="">Começar do zero</option>
            {existingGhes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.pgrTitle}
              </option>
            ))}
          </select>
          <span className="text-xs text-ink-muted">
            Isso só copia os dados pra começar — vira um GHE independente deste PGR.
          </span>
        </label>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nome do GHE</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Código</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição do local</span>
        <textarea className="input min-h-[60px] resize-y" value={localDescription} onChange={(e) => setLocalDescription(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição da atividade</span>
        <textarea className="input min-h-[60px] resize-y" value={activityDescription} onChange={(e) => setActivityDescription(e.target.value)} />
      </label>
      <AiSuggestButton<{ improvedText: string }>
        label="Melhorar redação com IA"
        disabledReason={activityDescription.trim().length < 5 ? "Escreva um rascunho da atividade primeiro." : undefined}
        onFetch={() => api.post("/pgr/ai/improve-activity", { text: activityDescription })}
        onApply={(r) => setActivityDescription(r.improvedText)}
        renderPreview={(r) => <p className="text-ink">{r.improvedText}</p>}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}

function GheCard({
  ghe,
  departments,
  positions,
  onChanged,
}: {
  ghe: Ghe;
  departments: Department[];
  positions: Position[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showFunctionForm, setShowFunctionForm] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-paper-raised">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className="font-medium text-ink">{ghe.name}</span>
          {ghe.code && <span className="font-mono text-xs text-ink-muted">{ghe.code}</span>}
          {ghe.employeesCount !== undefined && (
            <span
              className="flex items-center gap-1 rounded-full bg-teal-tint px-2 py-0.5 text-xs font-medium text-teal-deep"
              title="Colaboradores vinculados a este GHE (pelo setor/cargo)"
            >
              <Users size={11} /> {ghe.employeesCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1 text-xs text-teal-deep hover:underline"
        >
          <Pencil size={12} /> {editing ? "Fechar" : "Editar GHE"}
        </button>
      </div>

      {open && (
        <div className="border-t border-line px-4 py-3">
          {editing ? (
            <EditGheForm ghe={ghe} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />
          ) : (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Descrição do local" value={ghe.localDescription} />
              <Field label="Descrição da atividade" value={ghe.activityDescription} />
            </div>
          )}

          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Setor / Cargo / Atividade</p>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-teal-deep hover:underline"
                onClick={() => setShowFunctionForm((v) => !v)}
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {showFunctionForm && (
              <GheFunctionForm
                gheId={ghe.id}
                departments={departments}
                positions={positions}
                onClose={() => setShowFunctionForm(false)}
                onSaved={() => { setShowFunctionForm(false); onChanged(); }}
              />
            )}
            <div className="mt-2 flex flex-col gap-2">
              {ghe.functions.length === 0 && (
                <p className="text-sm text-ink-muted">Nenhuma função vinculada a este GHE.</p>
              )}
              {ghe.functions.map((f) => (
                <GheFunctionRow key={f.id} entry={f} onChanged={onChanged} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditGheForm({ ghe, onClose, onSaved }: { ghe: Ghe; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(ghe.name);
  const [code, setCode] = useState(ghe.code ?? "");
  const [localDescription, setLocalDescription] = useState(ghe.localDescription ?? "");
  const [activityDescription, setActivityDescription] = useState(ghe.activityDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/pgr/ghe/${ghe.id}`, {
        name,
        code: code || undefined,
        localDescription: localDescription || undefined,
        activityDescription: activityDescription || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nome do GHE</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Código</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição do local</span>
        <textarea className="input min-h-[60px] resize-y" value={localDescription} onChange={(e) => setLocalDescription(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição da atividade</span>
        <textarea className="input min-h-[60px] resize-y" value={activityDescription} onChange={(e) => setActivityDescription(e.target.value)} />
      </label>
      <AiSuggestButton<{ improvedText: string }>
        label="Melhorar redação com IA"
        disabledReason={activityDescription.trim().length < 5 ? "Escreva um rascunho da atividade primeiro." : undefined}
        onFetch={() => api.post("/pgr/ai/improve-activity", { text: activityDescription })}
        onApply={(r) => setActivityDescription(r.improvedText)}
        renderPreview={(r) => <p className="text-ink">{r.improvedText}</p>}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}

function GheFunctionForm({
  gheId,
  departments,
  positions,
  onClose,
  onSaved,
}: {
  gheId: string;
  departments: Department[];
  positions: Position[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [positionId, setPositionId] = useState(positions[0]?.id ?? "");
  const [activityDescription, setActivityDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/pgr/ghe-functions", {
        gheId,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        activityDescription: activityDescription || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3 rounded-md border border-line p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Setor</span>
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Nenhum</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Cargo</span>
          <select className="input" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            <option value="">Nenhum</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição da atividade (deste cargo neste GHE)</span>
        <textarea className="input min-h-[60px] resize-y" value={activityDescription} onChange={(e) => setActivityDescription(e.target.value)} />
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

function GheFunctionRow({ entry, onChanged }: { entry: GheFunction; onChanged: () => void }) {
  async function handleRemove() {
    if (!window.confirm("Remover este vínculo de setor/cargo do GHE?")) return;
    await api.del(`/pgr/ghe-functions/${entry.id}`);
    onChanged();
  }

  return (
    <div className="rounded-md border border-line px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-ink">
          <span className="font-medium">{entry.department?.name ?? "Setor não informado"}</span>
          {" — "}
          <span>{entry.position?.name ?? "Cargo não informado"}</span>
        </p>
        <button onClick={handleRemove} className="flex shrink-0 items-center gap-1 text-xs text-amber hover:underline">
          <Trash2 size={12} /> Remover
        </button>
      </div>
      {entry.activityDescription && <p className="mt-1 text-ink-muted">{entry.activityDescription}</p>}
    </div>
  );
}
