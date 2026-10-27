import { FormEvent, useEffect, useState } from "react";
import { ModalFrame } from "../ui/modal";
import { Layers, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api } from "../../lib/api";
import type { Department, Ghe, GheFunction, Nr01GheListItem, PgrDetail, Position } from "../../lib/types";
import { Field } from "./pgr-shared";
import { DepartmentPicker, allPositionIds, colabLabel, countFor, useDepartmentSummary, type DepartmentSummary } from "./ghe-department";

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
  const summary = useDepartmentSummary(pgr.companyId);

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
          summary={summary}
          onClose={() => setShowGheForm(false)}
          onCreated={() => {
            setShowGheForm(false);
            onChanged();
          }}
        />
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {pgr.ghes.length === 0 && (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted xl:col-span-2">
            Nenhum GHE cadastrado ainda. Clique em “Novo GHE” para começar.
          </p>
        )}
        {pgr.ghes.map((g) => (
          <GheCard key={g.id} ghe={g} departments={departments} positions={positions} summary={summary} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function NewGheForm({
  pgrId,
  companyId,
  summary,
  onClose,
  onCreated,
}: {
  pgrId: string;
  companyId: string;
  summary: DepartmentSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [existingGhes, setExistingGhes] = useState<Nr01GheListItem[]>([]);
  const [copyFromId, setCopyFromId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionIds, setPositionIds] = useState<string[]>([]);
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

  function handleDepartment(id: string) {
    setDepartmentId(id);
    setPositionIds(allPositionIds(summary, id));
    const dep = summary.find((d) => d.id === id);
    if (dep) {
      setName(dep.name);
      setCode(dep.code ?? "");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/pgr/ghe", {
        pgrId,
        departmentId: departmentId || undefined,
        positionIds: departmentId ? positionIds : undefined,
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
    <ModalFrame title={"Novo GHE"} onClose={onClose}>
<form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3">
      {summary.length > 0 && (
        <DepartmentPicker
          summary={summary}
          departmentId={departmentId}
          positionIds={positionIds}
          onDepartmentChange={handleDepartment}
          onPositionsChange={setPositionIds}
        />
      )}
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
</ModalFrame>
  );
}

function GheCard({
  ghe,
  departments,
  positions,
  summary,
  onChanged,
}: {
  ghe: Ghe;
  departments: Department[];
  positions: Position[];
  summary: DepartmentSummary[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showFunctionForm, setShowFunctionForm] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Excluir o GHE "${ghe.name}" deste PGR? Os riscos lançados nele também serão excluídos.`)) return;
    await api.del(`/pgr/ghe/${ghe.id}`);
    onChanged();
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
      <div className="h-1 bg-gradient-to-r from-teal to-teal-deep" />
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-tint text-teal-deep">
            <Layers size={19} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-ink">{ghe.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {ghe.code && <span className="rounded-full bg-line px-2 py-0.5 font-mono text-ink-muted">{ghe.code}</span>}
              {ghe.employeesCount !== undefined && (
                <span
                  className="flex items-center gap-1 rounded-full bg-teal-tint px-2 py-0.5 font-medium text-teal-deep"
                  title="Colaboradores vinculados a este GHE (pelo setor/cargo)"
                >
                  <Users size={11} /> {colabLabel(ghe.employeesCount)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-teal-deep hover:bg-teal-tint"
          >
            <Pencil size={12} /> Editar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={`Excluir GHE ${ghe.name}`}
            className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-amber hover:bg-amber-tint"
          >
            <Trash2 size={12} /> Excluir
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-4">
        {editing && <EditGheForm ghe={ghe} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />}
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="rounded-lg bg-paper p-3">
            <Field label="Descrição do local" value={ghe.localDescription} />
          </div>
          <div className="rounded-lg bg-paper p-3">
            <Field label="Descrição da atividade" value={ghe.activityDescription} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Setores e cargos</p>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline"
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
              summary={summary}
              onClose={() => setShowFunctionForm(false)}
              onSaved={() => { setShowFunctionForm(false); onChanged(); }}
            />
          )}
          <div className="mt-2 flex flex-col gap-2">
            {ghe.functions.length === 0 && (
              <p className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-ink-muted">
                Nenhum setor ou cargo vinculado a este GHE.
              </p>
            )}
            {ghe.functions.map((f) => (
              <GheFunctionRow key={f.id} entry={f} summary={summary} onChanged={onChanged} />
            ))}
          </div>
        </div>
      </div>
    </article>
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
    <ModalFrame title={"Editar GHE"} onClose={onClose}>
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3">
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
    </ModalFrame>
  );
}

function GheFunctionForm({
  gheId,
  departments,
  positions,
  summary,
  onClose,
  onSaved,
}: {
  gheId: string;
  departments: Department[];
  positions: Position[];
  summary: DepartmentSummary[];
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
    <ModalFrame title={"Vincular setor e cargo ao GHE"} onClose={onClose}>
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Setor</span>
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Nenhum</option>
            {departments.map((d) => {
              const n = countFor(summary, d.id);
              return (
                <option key={d.id} value={d.id}>{d.name}{n !== null ? ` — ${colabLabel(n)}` : ""}</option>
              );
            })}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Cargo</span>
          <select className="input" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            <option value="">Nenhum</option>
            {positions.map((p) => {
              const n = departmentId ? countFor(summary, departmentId, p.id) : null;
              return (
                <option key={p.id} value={p.id}>{p.name}{n !== null ? ` — ${colabLabel(n)} no setor` : ""}</option>
              );
            })}
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
    </ModalFrame>
  );
}

function GheFunctionRow({ entry, summary, onChanged }: { entry: GheFunction; summary: DepartmentSummary[]; onChanged: () => void }) {
  const count = countFor(summary, entry.departmentId, entry.positionId);
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
          {count !== null && <span className="ml-2 text-xs text-ink-muted">· {colabLabel(count)}</span>}
        </p>
        <button onClick={handleRemove} className="flex shrink-0 items-center gap-1 text-xs text-amber hover:underline">
          <Trash2 size={12} /> Remover
        </button>
      </div>
      {entry.activityDescription && <p className="mt-1 text-ink-muted">{entry.activityDescription}</p>}
    </div>
  );
}
