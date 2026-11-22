import { ModalField } from "../ui/modal";

/** Medição de ruído em dB(A): empresa que mediu, técnica, equipamento, data e valores. */
export interface Measurement {
  company: string;
  technique: string;
  equipment: string;
  date: string;
  value: string;
  actionLevel: string;
  limit: string;
}

/** Valores de referência para jornada de 8 h (NR-15 / NR-09): nível de ação 80 dB(A) e limite de tolerância 85 dB(A). */
export const EMPTY_MEASUREMENT: Measurement = { company: "", technique: "", equipment: "", date: "", value: "", actionLevel: "80", limit: "85" };

/** Só riscos de ruído têm medição. */
export const isNoiseHazard = (name: string | undefined | null) =>
  !!name && /ruido/.test(name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());

const num = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : null);

/** Campos da medição para o corpo da requisição (vazio vira null). */
export function measurementPayload(m: Measurement) {
  return {
    measurementCompany: m.company.trim() || null,
    measurementTechnique: m.technique.trim() || null,
    measurementEquipment: m.equipment.trim() || null,
    measurementDate: m.date || null,
    measurementValue: num(m.value),
    measurementActionLevel: num(m.actionLevel),
    measurementLimit: num(m.limit),
  };
}

type Saved = {
  measurementCompany?: string | null;
  measurementTechnique?: string | null;
  measurementEquipment?: string | null;
  measurementDate?: string | null;
  measurementValue?: string | number | null;
  measurementActionLevel?: string | number | null;
  measurementLimit?: string | number | null;
};

/** Medição salva → estado do formulário (sem valor salvo, usa os de referência para nível de ação e LT). */
export function measurementFrom(r?: Saved | null): Measurement {
  const s = (v: string | number | null | undefined, fallback: string) => (v == null || v === "" ? fallback : String(Number(v)));
  return {
    company: r?.measurementCompany ?? "",
    technique: r?.measurementTechnique ?? "",
    equipment: r?.measurementEquipment ?? "",
    date: r?.measurementDate?.slice(0, 10) ?? "",
    value: s(r?.measurementValue, ""),
    actionLevel: s(r?.measurementActionLevel, EMPTY_MEASUREMENT.actionLevel),
    limit: s(r?.measurementLimit, EMPTY_MEASUREMENT.limit),
  };
}

export function NoiseMeasurementFields({ value, onChange }: { value: Measurement; onChange: (m: Measurement) => void }) {
  const set = (k: keyof Measurement) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="rounded-md border border-line p-4" aria-label="Medição de ruído">
      <p className="font-display text-sm font-bold uppercase text-ink">Medição (ruído)</p>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ModalField label="Empresa que realizou a medição">
          <input className="input" aria-label="Empresa da medição" value={value.company} onChange={set("company")} />
        </ModalField>
        <ModalField label="Técnica utilizada">
          <input className="input" aria-label="Técnica utilizada" placeholder="ex.: NHO 01 da Fundacentro" value={value.technique} onChange={set("technique")} />
        </ModalField>
        <ModalField label="Equipamento">
          <input className="input" aria-label="Equipamento" placeholder="ex.: decibelímetro" value={value.equipment} onChange={set("equipment")} />
        </ModalField>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <ModalField label="Data da medição">
          <input className="input" type="date" aria-label="Data da medição" value={value.date} onChange={set("date")} />
        </ModalField>
        <ModalField label="Medição (dB(A))">
          <input className="input" inputMode="decimal" aria-label="Medição" placeholder="78,00" value={value.value} onChange={set("value")} />
        </ModalField>
        <ModalField label="Nível de ação (dB(A))">
          <input className="input" inputMode="decimal" aria-label="Nível de ação" value={value.actionLevel} onChange={set("actionLevel")} />
        </ModalField>
        <ModalField label="LT (dB(A))">
          <input className="input" inputMode="decimal" aria-label="LT" value={value.limit} onChange={set("limit")} />
        </ModalField>
      </div>
    </div>
  );
}
