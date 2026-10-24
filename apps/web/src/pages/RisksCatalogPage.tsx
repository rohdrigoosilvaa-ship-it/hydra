import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { X } from "lucide-react";
import { FormModal, ModalField } from "../components/ui/modal";
import type { ExposureType, Hazard, ProtectionEquipment, RiskCategory } from "../lib/types";

export const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  FISICO: "Físicos",
  QUIMICO: "Químicos",
  BIOLOGICO: "Biológicos",
  ERGONOMICO: "Ergonômicos",
  ACIDENTE: "Acidentes",
};
const CATEGORY_STYLE: Record<RiskCategory, string> = {
  FISICO: "bg-teal-tint text-teal-deep",
  QUIMICO: "bg-amber-tint text-amber",
  BIOLOGICO: "bg-teal-tint text-teal-deep",
  ERGONOMICO: "bg-teal-tint text-teal-deep",
  ACIDENTE: "bg-amber-tint text-amber",
};
export const EXPOSURE_LABEL: Record<ExposureType, string> = {
  HABITUAL: "Habitual",
  EVENTUAL: "Eventual",
  INTERMITENTE: "Intermitente",
  PERMANENTE: "Permanente",
};
export const TRI = [
  ["NAO_SE_APLICA", "Não se Aplica"],
  ["SIM", "Sim"],
  ["NAO", "Não"],
] as const;

/** Cadastro de riscos (catálogo do cliente), usado para vincular aos cargos e ao PGR. */
export function RisksCatalogPage() {
  const [hazards, setHazards] = useState<Hazard[] | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<RiskCategory | "">("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState({ name: "", category: "", code: "" });
  const [form, setForm] = useState<Hazard | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Hazard[]>("/pgr/hazards").then(setHazards).catch(() => setHazards([]));
  useEffect(() => {
    load();
  }, []);

  async function handleDelete(h: Hazard) {
    if (!window.confirm(`Excluir o risco "${h.name}"?`)) return;
    setError(null);
    try {
      await api.del(`/pgr/hazards/${h.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  const shown = (hazards ?? []).filter(
    (h) =>
      (!applied.name || h.name.toLowerCase().includes(applied.name.toLowerCase())) &&
      (!applied.category || h.category === applied.category) &&
      (!applied.code || (h.esocialCode ?? "").includes(applied.code.trim())),
  );

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Riscos</h1>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setForm("new")}>
          <Plus size={15} /> Adicionar risco
        </button>
      </div>

      <form
        className="mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ name, category, code });
        }}
      >
        <ModalField label="Nome">
          <input className="input" placeholder="Filtrar…" value={name} onChange={(e) => setName(e.target.value)} />
        </ModalField>
        <ModalField label="Categoria">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as RiskCategory | "")}>
            <option value="">Todas as Categorias</option>
            {(Object.keys(RISK_CATEGORY_LABEL) as RiskCategory[]).map((c) => (
              <option key={c} value={c}>{RISK_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Códigos">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </ModalField>
        <button type="submit" className="btn-primary px-8">Buscar</button>
      </form>

      {error && <p className="mt-3 text-sm text-amber" role="alert">{error}</p>}

      <div className="panel mt-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">eSocial</th>
              <th className="px-4 py-3 text-right font-medium">Opções</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((h) => (
              <tr key={h.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${CATEGORY_STYLE[h.category]}`}>{RISK_CATEGORY_LABEL[h.category]}</span>
                </td>
                <td className="px-4 py-3 text-ink">{h.name}</td>
                <td className="px-4 py-3 text-ink-muted">{h.esocialCode ? `(${h.esocialCode}) ${h.name}` : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button aria-label={`Editar ${h.name}`} title="Editar" onClick={() => setForm(h)} className="rounded-md bg-teal-deep p-2 text-white hover:opacity-90">
                      <Pencil size={14} />
                    </button>
                    <button aria-label={`Excluir ${h.name}`} title="Excluir" onClick={() => handleDelete(h)} className="rounded-md bg-amber p-2 text-white hover:opacity-90">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {hazards && shown.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-muted">Nenhum risco encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <RiskForm
          hazard={form === "new" ? undefined : form}
          all={hazards ?? []}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

export function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <ModalField label={label}>
      <select className="input" value={value ? "S" : "N"} onChange={(e) => onChange(e.target.value === "S")}>
        <option value="N">Não</option>
        <option value="S">Sim</option>
      </select>
    </ModalField>
  );
}

function RiskForm({ hazard, all, onClose, onSaved }: { hazard?: Hazard; all: Hazard[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Hazard>(
    () =>
      hazard ?? ({
        id: "", category: "FISICO", name: "", description: null, damagePotential: "", esocialCode: "",
        sourceCircumstances: "", observations: "", adminMeasures: "", exposureType: null, sendEsocial: false,
        measurementType: "QUALITATIVO", generatesUnhealthiness: false, generatesHazardPay: false,
        specialRetirement: false, insertInAso: true, epcStatus: "NAO_SE_APLICA", epiStatus: "NAO_SE_APLICA",
      } as Hazard),
  );
  const [copying, setCopying] = useState(false);
  const [bank, setBank] = useState<ProtectionEquipment[]>([]);
  const [chosen, setChosen] = useState<string[]>(() => (hazard?.protections ?? []).map((p) => p.equipment.id));
  const [newKind, setNewKind] = useState<"EPC" | "EPI" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Hazard>(k: K, val: Hazard[K]) => setV((cur) => ({ ...cur, [k]: val }));
  const text = (k: "name" | "esocialCode" | "damagePotential" | "observations" | "adminMeasures" | "sourceCircumstances") => v[k] ?? "";

  useEffect(() => {
    api.get<ProtectionEquipment[]>("/pgr/protection/equipment").then(setBank).catch(() => setBank([]));
  }, []);

  function copyFrom(id: string) {
    const src = all.find((h) => h.id === id);
    if (src) setV({ ...src, id: v.id, name: `${src.name} (cópia)`, esocialCode: "" });
    setCopying(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      category: v.category,
      name: v.name.trim(),
      esocialCode: (v.esocialCode ?? "").trim(),
      damagePotential: v.damagePotential ?? "",
      observations: v.observations ?? "",
      adminMeasures: v.adminMeasures ?? "",
      sourceCircumstances: v.sourceCircumstances ?? "",
      exposureType: v.exposureType ?? null,
      sendEsocial: v.sendEsocial,
      measurementType: v.measurementType,
      generatesUnhealthiness: v.generatesUnhealthiness,
      generatesHazardPay: v.generatesHazardPay,
      specialRetirement: v.specialRetirement,
      insertInAso: v.insertInAso,
      epcStatus: v.epcStatus,
      epiStatus: v.epiStatus,
      description: v.description ?? "",
      equipmentIds: chosen.filter((id) => {
        const kind = bank.find((b) => b.id === id)?.kind;
        return kind === "EPC" ? v.epcStatus === "SIM" : kind === "EPI" ? v.epiStatus === "SIM" : false;
      }),
    };
    try {
      if (hazard) await api.patch(`/pgr/hazards/${hazard.id}`, body);
      else await api.post("/pgr/hazards", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  return (
    <>
    <FormModal title="Risco" onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={v.name.trim().length >= 2} error={error} size="max-w-5xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <ModalField label="Nome" required>
            <input className="input" value={text("name")} onChange={(e) => set("name", e.target.value)} />
          </ModalField>
          {!hazard && (
            <div className="mt-1 text-xs">
              <button type="button" className="font-semibold text-teal-deep hover:underline" onClick={() => setCopying((c) => !c)}>
                Copiar de outro risco
              </button>
              {copying && (
                <select className="input mt-1 w-full" defaultValue="" onChange={(e) => copyFrom(e.target.value)} aria-label="Risco a copiar">
                  <option value="" disabled>Escolha…</option>
                  {all.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        <ModalField label="Categoria" required>
          <select className="input" value={v.category} onChange={(e) => set("category", e.target.value as RiskCategory)}>
            {(Object.keys(RISK_CATEGORY_LABEL) as RiskCategory[]).map((c) => (
              <option key={c} value={c}>{RISK_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </ModalField>
        <div className="grid grid-cols-2 gap-3">
          <ModalField label="Tipo de exposição">
            <select className="input" value={v.exposureType ?? ""} onChange={(e) => set("exposureType", (e.target.value || null) as ExposureType | null)}>
              <option value="">Não Definida</option>
              {(Object.keys(EXPOSURE_LABEL) as ExposureType[]).map((t) => (
                <option key={t} value={t}>{EXPOSURE_LABEL[t]}</option>
              ))}
            </select>
          </ModalField>
          <YesNo label="Enviar p/ eSocial" value={!!v.sendEsocial} onChange={(x) => set("sendEsocial", x)} />
        </div>
      </div>

      <ModalField label="Código eSocial V.S-1.2">
        <input className="input" value={text("esocialCode")} onChange={(e) => set("esocialCode", e.target.value)} />
      </ModalField>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">
          Descrição do fator de risco
          <button type="button" className="hover:underline" onClick={() => set("description", v.name)}>[copiar do nome]</button>
        </span>
        <textarea className="input min-h-[5rem]" aria-label="Descrição do fator de risco" value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ModalField label="Possíveis danos à saúde">
          <textarea className="input min-h-[5rem]" value={text("damagePotential")} onChange={(e) => set("damagePotential", e.target.value)} />
        </ModalField>
        <ModalField label="Observações">
          <textarea className="input min-h-[5rem]" value={text("observations")} onChange={(e) => set("observations", e.target.value)} />
        </ModalField>
      </div>
      <ModalField label="Fonte ou situação de exposição">
        <textarea className="input min-h-[4rem]" value={text("sourceCircumstances")} onChange={(e) => set("sourceCircumstances", e.target.value)} />
      </ModalField>
      <ModalField label="Medidas administrativas ou de organização do trabalho">
        <textarea className="input min-h-[5rem]" value={text("adminMeasures")} onChange={(e) => set("adminMeasures", e.target.value)} />
      </ModalField>

      <ModalField label="Tipo da medição">
        <select className="input" value={v.measurementType} onChange={(e) => set("measurementType", e.target.value as "QUALITATIVO" | "QUANTITATIVO")}>
          <option value="QUALITATIVO">Qualitativo</option>
          <option value="QUANTITATIVO">Quantitativo</option>
        </select>
      </ModalField>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <YesNo label="Gera insalubridade" value={!!v.generatesUnhealthiness} onChange={(x) => set("generatesUnhealthiness", x)} />
        <YesNo label="Gera periculosidade" value={!!v.generatesHazardPay} onChange={(x) => set("generatesHazardPay", x)} />
        <YesNo label="Aposentadoria especial" value={!!v.specialRetirement} onChange={(x) => set("specialRetirement", x)} />
        <YesNo label="Inserir risco no ASO" value={!!v.insertInAso} onChange={(x) => set("insertInAso", x)} />
      </div>
      <ModalField label="EPCs: implementam medidas de proteção coletiva">
        <select className="input" value={v.epcStatus} onChange={(e) => set("epcStatus", e.target.value)}>
          {TRI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </ModalField>
      {v.epcStatus === "SIM" && <ProtectionBox kind="EPC" bank={bank} chosen={chosen} setChosen={setChosen} onNew={() => setNewKind("EPC")} />}
      <ModalField label="EPIs: implementam medidas de proteção individual">
        <select className="input" value={v.epiStatus} onChange={(e) => set("epiStatus", e.target.value)}>
          {TRI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </ModalField>
      {v.epiStatus === "SIM" && <ProtectionBox kind="EPI" bank={bank} chosen={chosen} setChosen={setChosen} onNew={() => setNewKind("EPI")} />}
    </FormModal>
    {newKind && (
      <NewProtectionModal
        kind={newKind}
        onClose={() => setNewKind(null)}
        onCreated={(eq) => {
          setBank((cur) => [...cur, eq]);
          setChosen((cur) => [...cur, eq.id]);
          setNewKind(null);
        }}
      />
    )}
    </>
  );
}

/** Quadro "EPC/EPI para este risco": lista os equipamentos indicados e permite adicionar. */
export function ProtectionBox({ kind, bank, chosen, setChosen, onNew }: { kind: "EPC" | "EPI"; bank: ProtectionEquipment[]; chosen: string[]; setChosen: (v: string[]) => void; onNew: () => void }) {
  const mine = bank.filter((b) => b.kind === kind);
  const picked = mine.filter((b) => chosen.includes(b.id));
  const free = mine.filter((b) => !chosen.includes(b.id));
  return (
    <div className="rounded-md border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-sm font-bold uppercase text-ink">{kind} para este risco</p>
        <div className="flex flex-wrap items-center gap-2">
          {free.length > 0 && (
            <select className="input" value="" aria-label={`Escolher ${kind} do banco`} onChange={(e) => e.target.value && setChosen([...chosen, e.target.value])}>
              <option value="">Escolher do banco…</option>
              {free.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button type="button" className="btn-primary flex items-center gap-1.5" onClick={onNew}>
            <Plus size={15} /> Adicionar
          </button>
        </div>
      </div>
      {picked.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Nenhum {kind} indicado para este risco.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line text-sm">
          {picked.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-ink">
                {b.name}
                {b.category && <span className="ml-2 text-xs text-ink-muted">{b.category.name}</span>}
              </span>
              <button type="button" aria-label={`Remover ${b.name}`} className="text-amber" onClick={() => setChosen(chosen.filter((x) => x !== b.id))}><X size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NewProtectionModal({ kind, onClose, onCreated }: { kind: "EPC" | "EPI"; onClose: () => void; onCreated: (eq: ProtectionEquipment) => void }) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [life, setLife] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ id: string; name: string }[]>(`/pgr/protection/categories?kind=${kind}`).then(setCategories).catch(() => setCategories([]));
  }, [kind]);

  async function addCategory() {
    const n = window.prompt("Nome da nova categoria:")?.trim();
    if (!n) return;
    try {
      const cat = await api.post<{ id: string; name: string }>("/pgr/protection/categories", { kind, name: n });
      setCategories((cur) => (cur.some((c) => c.id === cat.id) ? cur : [...cur, cat]));
      setCategoryId(cat.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar categoria.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const eq = await api.post<ProtectionEquipment>("/pgr/protection/equipment", {
        kind,
        categoryId: categoryId || undefined,
        name: name.trim(),
        usefulLifeMonths: life ? Number(life) : undefined,
        description: description.trim(),
      });
      onCreated(eq);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  return (
    <FormModal title={`Novo ${kind}`} onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={name.trim().length >= 2 && description.trim().length >= 2} error={error} size="max-w-2xl">
      <p className="rounded-md bg-teal-tint px-4 py-3 text-sm text-ink-muted">
        Os {kind}s criados nesta tela serão adicionados ao seu Banco de Equipamentos de Proteção. Posteriormente eles poderão ser vinculados a qualquer empresa.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">
          Categoria <button type="button" className="hover:underline" onClick={addCategory}>[adicionar]</button>
        </span>
        <select className="input" aria-label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">--</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ModalField label="Nome" required>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </ModalField>
        <ModalField label="Vida útil em uso (meses)">
          <input className="input" type="number" min={1} value={life} onChange={(e) => setLife(e.target.value)} />
        </ModalField>
      </div>
      <ModalField label="Descrição" required>
        <textarea className="input min-h-[5rem]" value={description} onChange={(e) => setDescription(e.target.value)} />
      </ModalField>
    </FormModal>
  );
}
