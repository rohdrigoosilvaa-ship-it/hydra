import { FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { COLOR_CHOICES, iconByName } from "../../lib/appearance";
import { AppearancePicker } from "../../components/company/AppearancePicker";
import type { EnvironmentUnitType, WorkEnvironment } from "../../lib/types";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

/** Ambientes da empresa. */
export function EnvironmentsTab() {
  const { company, search } = useOutletContext<CompanyWorkspaceContext>();
  const [items, setItems] = useState<WorkEnvironment[] | null>(null);
  const [form, setForm] = useState<WorkEnvironment | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api.get<WorkEnvironment[]>(`/environments?companyId=${company.id}`));
  }
  useEffect(() => {
    load().catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  async function handleDelete(env: WorkEnvironment) {
    if (!window.confirm(`Excluir o ambiente "${env.name}"? Os cargos deixam de transitar por ele.`)) return;
    setError(null);
    try {
      await api.del(`/environments/${env.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  const q = search.trim().toLowerCase();
  const shown = (items ?? []).filter((e) => !q || [e.name, e.location, e.description].some((v) => v?.toLowerCase().includes(q)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Ambientes</h2>
        {items && items.length > 0 && (
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setForm("new")}>
            <Plus size={15} /> Novo ambiente
          </button>
        )}
      </div>

      {form && (
        <EnvironmentForm
          companyId={company.id}
          environment={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await load();
          }}
        />
      )}
      {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}

      {items && items.length === 0 && !form && (
        <div className="card mt-4 flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-ink-muted">Nenhum ambiente foi cadastrado para esta empresa.</p>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setForm("new")}>
            <Plus size={15} /> Cadastrar novo ambiente
          </button>
        </div>
      )}

      {shown.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((env) => {
            const Icon = iconByName(env.icon);
            return (
              <div key={env.id} className="card">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: env.color ?? COLOR_CHOICES[0] }}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{env.name}</p>
                    <p className="text-xs text-ink-muted">{env.unitType === "MATRIZ" ? "Matriz" : "Filial"}{env.location ? ` · ${env.location}` : ""}</p>
                  </div>
                </div>
                {env.description && <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{env.description}</p>}
                <p className="mt-2 text-xs text-ink-muted">{env._count?.positions ?? 0} cargo(s) transitam aqui</p>
                <div className="mt-3 flex gap-3 border-t border-line pt-3">
                  <button onClick={() => setForm(env)} className="flex items-center gap-1.5 text-xs text-teal-deep hover:underline">
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(env)} className="flex items-center gap-1.5 text-xs text-amber hover:underline">
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {items && items.length > 0 && shown.length === 0 && <p className="mt-4 text-sm text-ink-muted">Nenhum ambiente encontrado para “{search}”.</p>}
    </div>
  );
}

function EnvironmentForm({
  companyId,
  environment,
  onClose,
  onSaved,
}: {
  companyId: string;
  environment?: WorkEnvironment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(environment?.name ?? "");
  const [color, setColor] = useState(environment?.color ?? COLOR_CHOICES[0]!);
  const [icon, setIcon] = useState(environment?.icon ?? "building");
  const [description, setDescription] = useState(environment?.description ?? "");
  const [location, setLocation] = useState(environment?.location ?? "");
  const [unitType, setUnitType] = useState<EnvironmentUnitType>(environment?.unitType ?? "MATRIZ");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { name: name.trim(), color, icon, description: description.trim(), location: location.trim(), unitType };
    try {
      if (environment) await api.patch(`/environments/${environment.id}`, body);
      else await api.post("/environments", { companyId, ...body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-4">
      <h3 className="font-display text-base font-semibold text-ink">{environment ? "Editar ambiente" : "Novo Ambiente"}</h3>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Nome do ambiente</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoFocus />
      </label>
      <AppearancePicker color={color} icon={icon} onColor={setColor} onIcon={setIcon} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição do ambiente</span>
        <textarea className="input min-h-[70px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Local do ambiente</span>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Matriz ou Filial</span>
          <select className="input" value={unitType} onChange={(e) => setUnitType(e.target.value as EnvironmentUnitType)}>
            <option value="MATRIZ">Matriz</option>
            <option value="FILIAL">Filial</option>
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-amber" role="alert">{error}</p>}
      <div className="flex gap-2 border-t border-line pt-4">
        <button type="submit" disabled={saving || name.trim().length < 2} className="btn-primary">{saving ? "Salvando…" : "Salvar"}</button>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  );
}
