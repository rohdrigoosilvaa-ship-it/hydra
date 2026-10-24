import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { FormModal, ModalField } from "../components/ui/modal";
import type { ExposureType, Hazard, RiskCategory } from "../lib/types";

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
const TRI = [
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

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Hazard>(k: K, val: Hazard[K]) => setV((cur) => ({ ...cur, [k]: val }));
  const text = (k: "name" | "esocialCode" | "damagePotential" | "observations" | "adminMeasures" | "sourceCircumstances") => v[k] ?? "";

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
      <ModalField label="EPIs: implementam medidas de proteção individual">
        <select className="input" value={v.epiStatus} onChange={(e) => set("epiStatus", e.target.value)}>
          {TRI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </ModalField>
    </FormModal>
  );
}
