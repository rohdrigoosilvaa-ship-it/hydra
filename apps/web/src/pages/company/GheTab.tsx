import { FormEvent, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { COLOR_CHOICES, iconByName } from "../../lib/appearance";
import { AppearancePicker } from "../../components/company/AppearancePicker";
import { CboPicker } from "../../components/CboPicker";
import { FormModal } from "../../components/ui/modal";
import type { Position, WorkEnvironment } from "../../lib/types";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

/** GHE / Cargos da empresa. */
export function GheTab() {
  const { company, search } = useOutletContext<CompanyWorkspaceContext>();
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [environments, setEnvironments] = useState<WorkEnvironment[]>([]);
  const [form, setForm] = useState<Position | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [pos, envs] = await Promise.all([
      api.get<Position[]>(`/positions?companyId=${company.id}`),
      api.get<WorkEnvironment[]>(`/environments?companyId=${company.id}`),
    ]);
    setPositions(pos);
    setEnvironments(envs);
  }
  useEffect(() => {
    load().catch(() => setPositions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  async function handleDelete(position: Position) {
    if (!window.confirm(`Excluir o cargo "${position.name}"?`)) return;
    setError(null);
    try {
      await api.del(`/positions/${position.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  const q = search.trim().toLowerCase();
  const shown = (positions ?? []).filter((p) => !q || [p.name, p.cbo, p.description].some((v) => v?.toLowerCase().includes(q)));
  const envName = (id: string) => environments.find((e) => e.id === id)?.name;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">GHE / Cargos</h2>
        {positions && positions.length > 0 && (
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setForm("new")}>
            <Plus size={15} /> Adicionar cargo
          </button>
        )}
      </div>

      {form && (
        <PositionForm
          companyId={company.id}
          environments={environments}
          position={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await load();
          }}
        />
      )}
      {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}

      {positions && positions.length === 0 && !form && (
        <div className="card mt-4 flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-ink-muted">Nenhum cargo foi cadastrado para esta empresa.</p>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setForm("new")}>
            <Plus size={15} /> Adicionar Cargo
          </button>
          {environments.length === 0 && (
            <p className="text-xs text-ink-muted">
              Dica: cadastre antes os <Link to="../ambientes" className="text-teal-deep hover:underline">ambientes</Link> para vincular o cargo a eles.
            </p>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const Icon = iconByName(p.icon);
            const names = (p.environments ?? []).map((e) => envName(e.environmentId)).filter(Boolean) as string[];
            return (
              <div key={p.id} className="card">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: p.color ?? COLOR_CHOICES[0] }}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-ink-muted">CBO {p.cbo ?? "—"}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  {names.length ? `Ambientes: ${names.join(", ")}` : "Sem ambientes vinculados"}
                </p>
                <div className="mt-3 flex gap-3 border-t border-line pt-3">
                  <button onClick={() => setForm(p)} className="flex items-center gap-1.5 text-xs text-teal-deep hover:underline">
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(p)} className="flex items-center gap-1.5 text-xs text-amber hover:underline">
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {positions && positions.length > 0 && shown.length === 0 && <p className="mt-4 text-sm text-ink-muted">Nenhum cargo encontrado para “{search}”.</p>}
    </div>
  );
}

function PositionForm({
  companyId,
  environments,
  position,
  onClose,
  onSaved,
}: {
  companyId: string;
  environments: WorkEnvironment[];
  position?: Position;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(position?.name ?? "");
  const [color, setColor] = useState(position?.color ?? COLOR_CHOICES[0]!);
  const [icon, setIcon] = useState(position?.icon ?? "briefcase");
  const [cbo, setCbo] = useState(position?.cbo ?? "");
  const [esocialStartDate, setEsocialStartDate] = useState(position?.esocialStartDate?.slice(0, 10) ?? "");
  const [requiresEntryAptitude, setRequiresEntryAptitude] = useState(position?.requiresEntryAptitude ?? false);
  const [envIds, setEnvIds] = useState<string[]>((position?.environments ?? []).map((e) => e.environmentId));
  const [sectorInfo, setSectorInfo] = useState(position?.sectorInfo ?? "");
  const [description, setDescription] = useState(position?.description ?? "");
  const [workSchedule, setWorkSchedule] = useState(position?.workSchedule ?? "");
  const [additionalInfo, setAdditionalInfo] = useState(position?.additionalInfo ?? "");
  const [technicalOpinion, setTechnicalOpinion] = useState(position?.technicalOpinion ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allLinked = environments.length > 0 && environments.every((e) => envIds.includes(e.id));
  const toggleEnv = (id: string) => setEnvIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      color,
      icon,
      cbo: cbo.trim(),
      esocialStartDate: esocialStartDate || undefined,
      requiresEntryAptitude,
      environmentIds: envIds,
      sectorInfo: sectorInfo.trim(),
      description: description.trim(),
      workSchedule: workSchedule.trim(),
      additionalInfo: additionalInfo.trim(),
      technicalOpinion: technicalOpinion.trim(),
    };
    try {
      if (position) await api.patch(`/positions/${position.id}`, { ...body, esocialStartDate: esocialStartDate || null });
      else await api.post("/positions", { companyId, ...body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const area = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}</span>
      <textarea className="input min-h-[70px] resize-y" value={value} onChange={(e) => set(e.target.value)} placeholder={hint} />
    </label>
  );

  return (
    <FormModal title={position ? "Editar cargo" : "Novo cargo"} onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={name.trim().length >= 2} error={error}>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Nome do cargo</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoFocus />
      </label>
      <AppearancePicker color={color} icon={icon} onColor={setColor} onIcon={setIcon} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">CBO</span>
          <CboPicker
            value={cbo}
            onChange={setCbo}
            onSelectOccupation={(occ) => {
              setCbo(occ.code);
              if (!name) setName(occ.title);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Data de início da validade dos dados para o eSocial</span>
          <input type="date" className="input" value={esocialStartDate} onChange={(e) => setEsocialStartDate(e.target.value)} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={requiresEntryAptitude} onChange={(e) => setRequiresEntryAptitude(e.target.checked)} />
        Aptidão para entrada <span className="text-xs text-ink-muted">(exige ASO apto na admissão)</span>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <legend className="text-ink-muted">Ambientes pelos quais o cargo transita</legend>
          {environments.length > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-teal-deep hover:underline"
              onClick={() => setEnvIds(allLinked ? [] : environments.map((e) => e.id))}
            >
              {allLinked ? "Desvincular todos" : "Vincular todos"}
            </button>
          )}
        </div>
        {environments.length === 0 ? (
          <p className="text-xs text-ink-muted">Nenhum ambiente cadastrado — cadastre na aba Ambiente.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {environments.map((env) => (
              <label key={env.id} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-ink">
                <input type="checkbox" checked={envIds.includes(env.id)} onChange={() => toggleEnv(env.id)} />
                {env.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {area("Informações do setor", sectorInfo, setSectorInfo)}
      {area("Atividades executadas pelos profissionais nesse cargo", description, setDescription)}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Jornada de trabalho / horário do cargo</span>
        <input className="input" value={workSchedule} onChange={(e) => setWorkSchedule(e.target.value)} placeholder="ex.: Segunda a sexta, 08:00 às 17:00" />
      </label>
      {area("Informações complementares", additionalInfo, setAdditionalInfo)}
      {area("Parecer técnico", technicalOpinion, setTechnicalOpinion)}

    </FormModal>
  );
}
