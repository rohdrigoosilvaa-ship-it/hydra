import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2, X } from "lucide-react";
import { api } from "../../lib/api";
import { FormModal, ModalField, ModalFrame } from "../../components/ui/modal";
import { EXPOSURE_LABEL, NewProtectionModal, ProtectionBox, RISK_CATEGORY_LABEL, TRI, YesNo } from "../RisksCatalogPage";
import { RiskCategoryBadge } from "../../components/risk/RiskCategoryBadge";
import { RiskAssessment, type Assessment } from "../../components/risk/RiskAssessment";
import { riskResult } from "../../lib/risk-assessment";
import type { ExposureType, Hazard, Position, PositionRisk, ProtectionEquipment, WorkEnvironment } from "../../lib/types";

const DASH = "—";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-3 text-sm text-ink">
      <span className="font-semibold">{label}:</span> {children}
    </div>
  );
}

function SectionActions({ onAdd, onClear, onImport, noun, disabledClear }: { onAdd: () => void; onClear: () => void; onImport: () => void; noun: string; disabledClear: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <button type="button" onClick={onAdd} className="flex items-center gap-1 text-teal-deep hover:underline"><Plus size={14} /> adicionar {noun}</button>
      <button type="button" onClick={onClear} disabled={disabledClear} className="flex items-center gap-1 text-amber hover:underline disabled:opacity-40"><Trash2 size={14} /> excluir {noun}s</button>
      <button type="button" onClick={onImport} className="flex items-center gap-1 text-teal-deep hover:underline"><Download size={14} /> importar {noun}s</button>
    </div>
  );
}

/** Ficha do cargo: dados, GHE, riscos e exames. */
export function PositionDetailModal({
  position,
  positions,
  environments,
  onClose,
  onChanged,
}: {
  position: Position;
  positions: Position[];
  environments: WorkEnvironment[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [dialog, setDialog] = useState<"risk" | "exam" | "import-risks" | "import-exams" | null>(null);
  const [editingRisk, setEditingRisk] = useState<PositionRisk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const envNames = (position.environments ?? []).map((e) => environments.find((x) => x.id === e.environmentId)?.name).filter(Boolean) as string[];
  const risks = position.risks ?? [];
  const exams = position.exams ?? [];

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <>
      <ModalFrame title={`Cargo — ${position.name}`} onClose={onClose} size="max-w-4xl">
        <div className="px-6 py-4">
          <h3 className="font-display text-lg font-semibold text-ink">
            {position.name} <span className="text-sm font-normal text-ink-muted">({risks.length} risco{risks.length === 1 ? "" : "s"}, {exams.length} exame{exams.length === 1 ? "" : "s"})</span>
          </h3>
          <Row label="Cargo">{position.name}</Row>
          <Row label="CBO">{position.cbo || DASH}</Row>
          <div className="border-b border-line py-3 text-sm text-ink">
            <p className="font-semibold">GHE que transita:</p>
            <p className="mt-1"><span className="font-semibold">Principal:</span> {envNames[0] ?? DASH}</p>
            <p><span className="font-semibold">Outros:</span> {envNames.length > 1 ? envNames.slice(1).join(", ") : DASH}</p>
          </div>
          <Row label="Atividades exercidas pelos funcionários">{position.description || DASH}</Row>
          <Row label="Recomendações de segurança">{position.safetyRecommendations || DASH}</Row>
          <Row label="GFIP">{position.gfipCode || "Não se aplica"}</Row>

          <div className="border-b border-line py-3">
            <div className="flex flex-wrap items-center gap-4">
              <p className="font-display text-sm font-bold uppercase text-ink">Riscos do cargo:</p>
              <SectionActions noun="risco" onAdd={() => setDialog("risk")} onImport={() => setDialog("import-risks")} disabledClear={risks.length === 0}
                onClear={() => window.confirm("Excluir todos os riscos deste cargo?") && run(() => api.del(`/positions/${position.id}/risks`))} />
            </div>
            {risks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Este cargo ainda não contém riscos.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {risks.map((r) => {
                  const res = riskResult(r.probability, r.severity, r.certainty);
                  return (
                    <li key={r.hazardId} className="flex items-center justify-between gap-3 py-2">
                      <button type="button" className="min-w-0 text-left" title="Editar risco do cargo" onClick={() => setEditingRisk(r)}>
                        <RiskCategoryBadge category={r.hazard.category} />
                        <span className="ml-2 text-ink hover:underline">{r.hazard.name}</span>
                        <span className="ml-2 text-xs text-ink-muted">
                          [{r.protection.filter((p) => p.equipment.kind === "EPC").length} EPC {r.protection.filter((p) => p.equipment.kind === "EPI").length} EPI] · {r.exposureType ? EXPOSURE_LABEL[r.exposureType] : "Exposição não definida"} · {r.sendEsocial ? "eSocial" : "sem eSocial"}
                        </span>
                        {res && <span className="ml-2 rounded px-2 py-0.5 text-xs text-ink" style={{ background: res.color }}>{res.label} ({res.product})</span>}
                      </button>
                      <button type="button" aria-label={`Remover ${r.hazard.name}`} className="text-amber hover:opacity-80" onClick={() => run(() => api.del(`/positions/${position.id}/risks/${r.hazardId}`))}><X size={15} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="py-3">
            <div className="flex flex-wrap items-center gap-4">
              <p className="font-display text-sm font-bold uppercase text-ink">Exames do cargo:</p>
              <SectionActions noun="exame" onAdd={() => setDialog("exam")} onImport={() => setDialog("import-exams")} disabledClear={exams.length === 0}
                onClear={() => window.confirm("Excluir todos os exames deste cargo?") && run(() => api.del(`/positions/${position.id}/exams`))} />
            </div>
            {exams.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Este cargo ainda não contém exames.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {exams.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-ink">{x.name}</span>
                    <button type="button" aria-label={`Remover ${x.name}`} className="text-amber hover:opacity-80" onClick={() => run(() => api.del(`/positions/${position.id}/exams/${x.id}`))}><X size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="text-sm text-amber" role="alert">{error}</p>}
        </div>
        <div className="flex justify-end border-t border-line px-6 py-4">
          <button type="button" onClick={onClose} className="text-base font-medium text-ink-muted hover:text-ink">Fechar</button>
        </div>
      </ModalFrame>

      {dialog === "risk" && (
        <LinkRiskModal position={position} positions={positions} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await onChanged(); }} />
      )}
      {editingRisk && (
        <LinkRiskModal position={position} positions={positions} editing={editingRisk} onClose={() => setEditingRisk(null)} onSaved={async () => { setEditingRisk(null); await onChanged(); }} />
      )}
      {dialog === "exam" && (
        <AddExamModal position={position} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await onChanged(); }} />
      )}
      {(dialog === "import-risks" || dialog === "import-exams") && (
        <ImportFromPositionModal
          kind={dialog === "import-risks" ? "riscos" : "exames"}
          position={position}
          positions={positions}
          onClose={() => setDialog(null)}
          onSaved={async () => { setDialog(null); await onChanged(); }}
        />
      )}
    </>
  );
}

const BLANK = {
  description: "", damagePotential: "", observations: "", sourceCircumstances: "", adminMeasures: "",
  measurementType: "QUALITATIVO" as "QUALITATIVO" | "QUANTITATIVO",
  generatesUnhealthiness: false, generatesHazardPay: false, specialRetirement: false, insertInAso: true,
  epcStatus: "NAO_SE_APLICA", epiStatus: "NAO_SE_APLICA",
};
type Fields = typeof BLANK;

/** Vincula (ou edita) um risco do cargo: já vem preenchido com o cadastro do risco e pode ser ajustado para a empresa. */
function LinkRiskModal({ position, positions, editing, onClose, onSaved }: { position: Position; positions: Position[]; editing?: PositionRisk; onClose: () => void; onSaved: () => void }) {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [bank, setBank] = useState<ProtectionEquipment[]>([]);
  const [positionIds, setPositionIds] = useState<string[]>([position.id]);
  const [hazardId, setHazardId] = useState(editing?.hazardId ?? "");
  const [riskSearch, setRiskSearch] = useState("");
  const [exposure, setExposure] = useState<ExposureType | "">(editing?.exposureType ?? "");
  const [esocial, setEsocial] = useState(editing?.sendEsocial ?? true);
  const [f, setF] = useState<Fields>(() => (editing ? { ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, (editing as unknown as Record<string, unknown>)[k] ?? (BLANK as Record<string, unknown>)[k]])) } as Fields : BLANK));
  const [chosen, setChosen] = useState<string[]>(() => (editing?.protection ?? []).map((p) => p.equipmentId));
  const [assessment, setAssessment] = useState<Assessment>({ probability: editing?.probability ?? null, severity: editing?.severity ?? null, certainty: editing?.certainty ?? null });
  const [newKind, setNewKind] = useState<"EPC" | "EPI" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Hazard[]>("/pgr/hazards").then(setHazards).catch(() => setHazards([]));
    api.get<ProtectionEquipment[]>("/pgr/protection/equipment").then(setBank).catch(() => setBank([]));
  }, []);

  const hazard = hazards.find((h) => h.id === hazardId);
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const allLinked = positionIds.length === positions.length;

  function pickHazard(id: string) {
    setHazardId(id);
    const h = hazards.find((x) => x.id === id);
    if (!h) return;
    setExposure(h.exposureType ?? "");
    setEsocial(h.sendEsocial ?? true);
    setF({
      description: h.description ?? "", damagePotential: h.damagePotential ?? "", observations: h.observations ?? "",
      sourceCircumstances: h.sourceCircumstances ?? "", adminMeasures: h.adminMeasures ?? "",
      measurementType: h.measurementType ?? "QUALITATIVO", generatesUnhealthiness: !!h.generatesUnhealthiness,
      generatesHazardPay: !!h.generatesHazardPay, specialRetirement: !!h.specialRetirement, insertInAso: h.insertInAso ?? true,
      epcStatus: h.epcStatus ?? "NAO_SE_APLICA", epiStatus: h.epiStatus ?? "NAO_SE_APLICA",
    });
    setChosen((h.protections ?? []).map((p) => p.equipment.id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      exposureType: exposure || null,
      sendEsocial: esocial,
      ...f,
      ...assessment,
      equipmentIds: chosen.filter((id) => {
        const kind = bank.find((b) => b.id === id)?.kind;
        return kind === "EPC" ? f.epcStatus === "SIM" : kind === "EPI" ? f.epiStatus === "SIM" : false;
      }),
    };
    try {
      if (editing) await api.patch(`/positions/${position.id}/risks/${editing.hazardId}`, body);
      else await api.post("/positions/link-risks", { ...body, positionIds, hazardId });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  const area = (label: string, k: "description" | "damagePotential" | "observations" | "sourceCircumstances" | "adminMeasures", extra?: ReactNode) => (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">{label}{extra}</span>
      <textarea className="input min-h-[4.5rem]" aria-label={label} value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  return (
    <>
      <FormModal title={editing ? "Risco do cargo" : "Vincular risco ao cargo"} onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={positionIds.length > 0 && !!hazardId} error={error} size="max-w-5xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">
              <span aria-hidden>★</span> Cargo
              {!editing && (
                <button type="button" className="hover:underline" onClick={() => setPositionIds(allLinked ? [position.id] : positions.map((p) => p.id))}>
                  [{allLinked ? "apenas este" : "vincular todos"}]
                </button>
              )}
            </p>
            <div className="mt-1.5 flex min-h-[2.5rem] flex-wrap gap-2 rounded-md border border-line p-2">
              {positions.filter((p) => positionIds.includes(p.id)).map((p) => (
                <span key={p.id} className="flex items-center gap-1.5 rounded bg-teal-deep px-2 py-1 text-sm text-white">
                  {!editing && <button type="button" aria-label={`Tirar ${p.name}`} onClick={() => setPositionIds((cur) => cur.filter((x) => x !== p.id))}><X size={12} /></button>}
                  {p.name}
                </span>
              ))}
            </div>
          </div>
          <ModalField label="Tipo de exposição">
            <select className="input" value={exposure} onChange={(e) => setExposure(e.target.value as ExposureType | "")}>
              <option value="">Não Definida</option>
              {(Object.keys(EXPOSURE_LABEL) as ExposureType[]).map((t) => <option key={t} value={t}>{EXPOSURE_LABEL[t]}</option>)}
            </select>
          </ModalField>
          <ModalField label="Enviar p/ eSocial">
            <select className="input" value={esocial ? "S" : "N"} onChange={(e) => setEsocial(e.target.value === "S")}>
              <option value="S">Sim</option>
              <option value="N">Não</option>
            </select>
          </ModalField>
        </div>

        <div>
          <p className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep"><span aria-hidden>★</span> Risco</p>
          {!editing && (
            <input className="input mt-1.5 w-full" placeholder="Pesquisar risco…" aria-label="Pesquisar risco" value={riskSearch} onChange={(e) => setRiskSearch(e.target.value)} />
          )}
          <div className="mt-1.5 max-h-56 overflow-y-auto rounded-md border border-line" role="listbox" aria-label="Risco">
            {hazards
              .filter((h) => (editing ? h.id === hazardId : !riskSearch.trim() || h.name.toLowerCase().includes(riskSearch.trim().toLowerCase())))
              .map((h) => (
                <button
                  key={h.id}
                  type="button"
                  role="option"
                  aria-selected={h.id === hazardId}
                  disabled={!!editing}
                  onClick={() => pickHazard(h.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-paper ${h.id === hazardId ? "bg-teal-tint font-medium" : ""}`}
                >
                  <RiskCategoryBadge category={h.category} />
                  <span className="text-ink">{h.name}</span>
                </button>
              ))}
          </div>
        </div>
        {hazards.length === 0 && <p className="text-xs text-ink-muted">Nenhum risco cadastrado. Cadastre em Segurança › Riscos.</p>}

        {hazardId && (
          <>
            {area("Descrição do fator de risco", "description")}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {area("Possíveis danos à saúde", "damagePotential")}
              {area("Observações", "observations", hazard && (
                <button type="button" className="hover:underline" onClick={() => set("observations", hazard.observations ?? "")}>[puxar do risco]</button>
              ))}
            </div>
            {area("Fonte ou situação de exposição", "sourceCircumstances")}
            {area("Medidas administrativas ou de organização do trabalho", "adminMeasures")}

            <ModalField label="Tipo da medição">
              <select className="input" value={f.measurementType} onChange={(e) => set("measurementType", e.target.value as Fields["measurementType"])}>
                <option value="QUALITATIVO">Qualitativo</option>
                <option value="QUANTITATIVO">Quantitativo</option>
              </select>
            </ModalField>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <YesNo label="Gera insalubridade" value={f.generatesUnhealthiness} onChange={(v) => set("generatesUnhealthiness", v)} />
              <YesNo label="Gera periculosidade" value={f.generatesHazardPay} onChange={(v) => set("generatesHazardPay", v)} />
              <YesNo label="Aposentadoria especial" value={f.specialRetirement} onChange={(v) => set("specialRetirement", v)} />
              <YesNo label="Inserir risco no ASO" value={f.insertInAso} onChange={(v) => set("insertInAso", v)} />
            </div>
            <ModalField label="EPCs: implementam medidas de proteção coletiva">
              <select className="input" value={f.epcStatus} onChange={(e) => set("epcStatus", e.target.value)}>
                {TRI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </ModalField>
            {f.epcStatus === "SIM" && <ProtectionBox kind="EPC" bank={bank} chosen={chosen} setChosen={setChosen} onNew={() => setNewKind("EPC")} />}
            <ModalField label="EPIs: implementam medidas de proteção individual">
              <select className="input" value={f.epiStatus} onChange={(e) => set("epiStatus", e.target.value)}>
                {TRI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </ModalField>
            {f.epiStatus === "SIM" && <ProtectionBox kind="EPI" bank={bank} chosen={chosen} setChosen={setChosen} onNew={() => setNewKind("EPI")} />}

            <div className="border-t border-line pt-4">
              <p className="mb-3 font-display text-sm font-bold uppercase text-ink">Avaliação do risco</p>
              <RiskAssessment value={assessment} onChange={setAssessment} />
            </div>
          </>
        )}
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

function AddExamModal({ position, onClose, onSaved }: { position: Position; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/positions/${position.id}/exams`, { names: [name.trim()] });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  return (
    <FormModal title="Adicionar exame ao cargo" onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={name.trim().length >= 2} error={error} size="max-w-xl">
      <ModalField label="Exame" required>
        <input className="input" placeholder="Ex.: Audiometria" value={name} onChange={(e) => setName(e.target.value)} />
      </ModalField>
    </FormModal>
  );
}

function ImportFromPositionModal({ kind, position, positions, onClose, onSaved }: { kind: "riscos" | "exames"; position: Position; positions: Position[]; onClose: () => void; onSaved: () => void }) {
  const others = positions.filter((p) => p.id !== position.id && (kind === "riscos" ? (p.risks?.length ?? 0) : (p.exams?.length ?? 0)) > 0);
  const [sourceId, setSourceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/positions/${position.id}/import-${kind === "riscos" ? "risks" : "exams"}`, { sourcePositionId: sourceId });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar.");
      setSaving(false);
    }
  }

  return (
    <FormModal title={`Importar ${kind}`} onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={!!sourceId} error={error} size="max-w-xl">
      <ModalField label={`Copiar ${kind} do cargo`} required>
        <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">Escolha…</option>
          {others.map((p) => <option key={p.id} value={p.id}>{p.name} ({kind === "riscos" ? p.risks?.length : p.exams?.length})</option>)}
        </select>
      </ModalField>
      {others.length === 0 && <p className="text-xs text-ink-muted">Nenhum outro cargo desta empresa tem {kind} cadastrados.</p>}
    </FormModal>
  );
}
