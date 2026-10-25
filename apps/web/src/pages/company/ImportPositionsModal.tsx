import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { api } from "../../lib/api";
import { FormModal, ModalField } from "../../components/ui/modal";
import type { Company, Position, WorkEnvironment } from "../../lib/types";

type Tab = "novos" | "riscos" | "exames" | "ambientes";
const TABS: { id: Tab; label: string }[] = [
  { id: "novos", label: "Novos Cargos" },
  { id: "riscos", label: "Exclusão de Riscos" },
  { id: "exames", label: "Exclusão de Exames" },
  { id: "ambientes", label: "Exclusão de GHE" },
];

const field = "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none";

/** Importar / duplicar cargos já cadastrados (desta ou de outra empresa). */
export function ImportPositionsModal({
  companyId,
  onClose,
  onImported,
}: {
  companyId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sourceId, setSourceId] = useState(companyId);
  const [available, setAvailable] = useState<Position[]>([]);
  const [sourceEnvs, setSourceEnvs] = useState<WorkEnvironment[]>([]);
  const [picked, setPicked] = useState<string[]>([]); // cargos na lista da direita
  const [markLeft, setMarkLeft] = useState<string[]>([]);
  const [markRight, setMarkRight] = useState<string[]>([]);
  const [searchLeft, setSearchLeft] = useState("");
  const [searchRight, setSearchRight] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [envMode, setEnvMode] = useState<Record<string, "ALL" | "NONE">>({});
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  const [riskMode, setRiskMode] = useState<Record<string, "ALL" | "NONE">>({});
  const [examMode, setExamMode] = useState<Record<string, "ALL" | "NONE">>({});
  const [exclHazards, setExclHazards] = useState<Record<string, string[]>>({});
  const [exclExams, setExclExams] = useState<Record<string, string[]>>({});
  const [tab, setTab] = useState<Tab>("novos");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Company[]>("/companies").then(setCompanies).catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    setPicked([]);
    setMarkLeft([]);
    setMarkRight([]);
    Promise.all([
      api.get<Position[]>(`/positions?companyId=${sourceId}`),
      api.get<WorkEnvironment[]>(`/environments?companyId=${sourceId}`),
    ])
      .then(([pos, envs]) => {
        setAvailable(pos);
        setSourceEnvs(envs);
        setNames((cur) => ({ ...Object.fromEntries(pos.map((p) => [p.id, p.name])), ...cur }));
      })
      .catch(() => {
        setAvailable([]);
        setSourceEnvs([]);
      });
  }, [sourceId]);

  const match = (p: Position, q: string) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase());
  const left = available.filter((p) => !picked.includes(p.id) && match(p, searchLeft));
  const right = available.filter((p) => picked.includes(p.id) && match(p, searchRight));
  const pickedPositions = available.filter((p) => picked.includes(p.id));
  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  function move(ids: string[], toRight: boolean) {
    setPicked((cur) => (toRight ? [...cur, ...ids.filter((i) => !cur.includes(i))] : cur.filter((i) => !ids.includes(i))));
    setMarkLeft([]);
    setMarkRight([]);
  }

  function toggleIn(setter: typeof setExcluded, key: string, id: string) {
    setter((cur) => {
      const list = cur[key] ?? [];
      return { ...cur, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    });
  }

  const envName = (id: string) => sourceEnvs.find((e) => e.id === id)?.name ?? "";
  const nameOf = (p: Position) => names[p.id] ?? p.name;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pickedPositions.some((p) => nameOf(p).trim().length < 2)) {
      setError("Informe o novo nome de todos os cargos.");
      setTab("novos");
      return;
    }
    setSaving(true);
    try {
      await api.post("/positions/import", {
        targetCompanyId: companyId,
        items: pickedPositions.map((p) => ({
          sourcePositionId: p.id,
          newName: nameOf(p).trim(),
          copyEnvironments: (envMode[p.id] ?? "ALL") === "ALL",
          excludeEnvironmentIds: excluded[p.id] ?? [],
          copyRisks: (riskMode[p.id] ?? "ALL") === "ALL",
          excludeHazardIds: exclHazards[p.id] ?? [],
          copyExams: (examMode[p.id] ?? "ALL") === "ALL",
          excludeExamIds: exclExams[p.id] ?? [],
        })),
      });
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar.");
    } finally {
      setSaving(false);
    }
  }

  const arrow = "flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-muted hover:border-teal hover:text-teal-deep disabled:opacity-40";

  return (
    <FormModal title="Importar/Duplicar cargo" onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={picked.length > 0} size="max-w-5xl" error={error}>
      <ModalField label="Empresa de origem">
        <select className={field} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.id === companyId ? " (esta empresa)" : ""}</option>
          ))}
        </select>
      </ModalField>

      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-2">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-teal-deep">Cargos a serem copiados</p>
          <input className={field} placeholder="Pesquisar" value={searchLeft} onChange={(e) => setSearchLeft(e.target.value)} />
          <div className="h-44 overflow-y-auto rounded-md border border-line">
            {left.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-paper">
                <input type="checkbox" checked={markLeft.includes(p.id)} onChange={() => toggle(markLeft, setMarkLeft, p.id)} />
                {p.name}
              </label>
            ))}
            {left.length === 0 && <p className="p-3 text-xs text-ink-muted">Nenhum cargo disponível.</p>}
          </div>
          <p className="text-xs text-ink-muted">{markLeft.length} de {left.length} cargos selecionados</p>
        </div>

        <div className="flex flex-row items-center justify-center gap-2 md:flex-col">
          <button type="button" className={arrow} title="Mover todos" aria-label="Mover todos" disabled={left.length === 0} onClick={() => move(left.map((p) => p.id), true)}><ChevronsRight size={16} /></button>
          <button type="button" className={arrow} title="Mover selecionados" aria-label="Mover selecionados" disabled={markLeft.length === 0} onClick={() => move(markLeft, true)}><ChevronRight size={16} /></button>
          <button type="button" className={arrow} title="Voltar selecionados" aria-label="Voltar selecionados" disabled={markRight.length === 0} onClick={() => move(markRight, false)}><ChevronLeft size={16} /></button>
          <button type="button" className={arrow} title="Voltar todos" aria-label="Voltar todos" disabled={right.length === 0} onClick={() => move(right.map((p) => p.id), false)}><ChevronsLeft size={16} /></button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-teal-deep">{picked.length} cargos para importação</p>
          <input className={field} placeholder="Pesquisar" value={searchRight} onChange={(e) => setSearchRight(e.target.value)} />
          <div className="h-44 overflow-y-auto rounded-md border border-line">
            {right.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-paper">
                <input type="checkbox" checked={markRight.includes(p.id)} onChange={() => toggle(markRight, setMarkRight, p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      {picked.length > 0 && (
        <div>
          <div className="flex gap-1 border-b border-line">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? "border-teal text-teal-deep" : "border-transparent text-ink-muted hover:text-ink"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {tab === "novos" &&
              pickedPositions.map((p) => (
                <div key={p.id} className="grid grid-cols-1 gap-3 rounded-md border border-line p-3 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <ModalField label="Novo nome do cargo" required>
                      <input className={field} value={nameOf(p)} onChange={(e) => setNames((cur) => ({ ...cur, [p.id]: e.target.value }))} />
                    </ModalField>
                  </div>
                  <ModalField label="GHE">
                    <select className={field} value={envMode[p.id] ?? "ALL"} onChange={(e) => setEnvMode((cur) => ({ ...cur, [p.id]: e.target.value as "ALL" | "NONE" }))}>
                      <option value="ALL">Todos os GHE do cargo</option>
                      <option value="NONE">Nenhum GHE</option>
                    </select>
                  </ModalField>
                  <ModalField label="Riscos">
                    <select className={field} value={riskMode[p.id] ?? "ALL"} onChange={(e) => setRiskMode((cur) => ({ ...cur, [p.id]: e.target.value as "ALL" | "NONE" }))}>
                      <option value="ALL">Todos os riscos do cargo</option>
                      <option value="NONE">Nenhum risco</option>
                    </select>
                  </ModalField>
                  <ModalField label="Exames">
                    <select className={field} value={examMode[p.id] ?? "ALL"} onChange={(e) => setExamMode((cur) => ({ ...cur, [p.id]: e.target.value as "ALL" | "NONE" }))}>
                      <option value="ALL">Todos os exames do cargo</option>
                      <option value="NONE">Nenhum exame</option>
                    </select>
                  </ModalField>
                </div>
              ))}

            {tab === "ambientes" &&
              pickedPositions.map((p) => {
                const linked = (p.environments ?? []).map((e) => e.environmentId);
                return (
                  <div key={p.id} className="rounded-md border border-line p-3">
                    <p className="text-sm font-medium text-ink">{nameOf(p)}</p>
                    {linked.length === 0 && <p className="mt-1 text-xs text-ink-muted">Este cargo não tem GHE vinculado.</p>}
                    <div className="mt-2 flex flex-wrap gap-3">
                      {linked.map((id) => (
                        <label key={id} className="flex items-center gap-1.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={(excluded[p.id] ?? []).includes(id)}
                            onChange={() =>
                              setExcluded((cur) => {
                                const list = cur[p.id] ?? [];
                                return { ...cur, [p.id]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
                              })
                            }
                          />
                          Não copiar {envName(id)}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

            {tab === "riscos" &&
              pickedPositions.map((p) => (
                <div key={p.id} className="rounded-md border border-line p-3">
                  <p className="text-sm font-medium text-ink">{nameOf(p)}</p>
                  {(p.risks ?? []).length === 0 && <p className="mt-1 text-xs text-ink-muted">Este cargo não tem riscos.</p>}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {(p.risks ?? []).map((r) => (
                      <label key={r.hazardId} className="flex items-center gap-1.5 text-sm text-ink">
                        <input type="checkbox" checked={(exclHazards[p.id] ?? []).includes(r.hazardId)} onChange={() => toggleIn(setExclHazards, p.id, r.hazardId)} />
                        Não copiar {r.hazard.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

            {tab === "exames" &&
              pickedPositions.map((p) => (
                <div key={p.id} className="rounded-md border border-line p-3">
                  <p className="text-sm font-medium text-ink">{nameOf(p)}</p>
                  {(p.exams ?? []).length === 0 && <p className="mt-1 text-xs text-ink-muted">Este cargo não tem exames.</p>}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {(p.exams ?? []).map((x) => (
                      <label key={x.id} className="flex items-center gap-1.5 text-sm text-ink">
                        <input type="checkbox" checked={(exclExams[p.id] ?? []).includes(x.id)} onChange={() => toggleIn(setExclExams, p.id, x.id)} />
                        Não copiar {x.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </FormModal>
  );
}
