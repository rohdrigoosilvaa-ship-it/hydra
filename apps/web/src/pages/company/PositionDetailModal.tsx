import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2, X } from "lucide-react";
import { api } from "../../lib/api";
import { FormModal, ModalField, ModalFrame } from "../../components/ui/modal";
import { EXPOSURE_LABEL, RISK_CATEGORY_LABEL } from "../RisksCatalogPage";
import type { ExposureType, Hazard, Position, WorkEnvironment } from "../../lib/types";

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

/** Ficha do cargo: dados, ambientes, riscos e exames. */
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
            <p className="font-semibold">Ambientes que transita:</p>
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
                {risks.map((r) => (
                  <li key={r.hazardId} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-ink">
                      {r.hazard.name}
                      <span className="ml-2 text-xs text-ink-muted">
                        {RISK_CATEGORY_LABEL[r.hazard.category]} · {r.exposureType ? EXPOSURE_LABEL[r.exposureType] : "Exposição não definida"} · {r.sendEsocial ? "eSocial" : "sem eSocial"}
                      </span>
                    </span>
                    <button type="button" aria-label={`Remover ${r.hazard.name}`} className="text-amber hover:opacity-80" onClick={() => run(() => api.del(`/positions/${position.id}/risks/${r.hazardId}`))}><X size={15} /></button>
                  </li>
                ))}
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

function LinkRiskModal({ position, positions, onClose, onSaved }: { position: Position; positions: Position[]; onClose: () => void; onSaved: () => void }) {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [positionIds, setPositionIds] = useState<string[]>([position.id]);
  const [hazardIds, setHazardIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [exposure, setExposure] = useState<ExposureType | "">("");
  const [esocial, setEsocial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Hazard[]>("/pgr/hazards").then(setHazards).catch(() => setHazards([]));
  }, []);

  const shown = useMemo(() => hazards.filter((h) => !search.trim() || h.name.toLowerCase().includes(search.trim().toLowerCase())), [hazards, search]);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const allLinked = positionIds.length === positions.length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/positions/link-risks", {
        positionIds,
        hazardIds,
        exposureType: exposure || undefined,
        sendEsocial: esocial,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular.");
      setSaving(false);
    }
  }

  return (
    <FormModal title="Vincular risco ao cargo" onClose={onClose} onSubmit={handleSubmit} saving={saving} canSave={positionIds.length > 0 && hazardIds.length > 0} error={error} size="max-w-4xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-wide text-teal-deep">
              <span aria-hidden>★</span> Cargo
              <button type="button" className="hover:underline" onClick={() => setPositionIds(allLinked ? [position.id] : positions.map((p) => p.id))}>
                [{allLinked ? "apenas este" : "vincular todos"}]
              </button>
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2 rounded-md border border-line p-2">
              {positions.filter((p) => positionIds.includes(p.id)).map((p) => (
                <span key={p.id} className="flex items-center gap-1.5 rounded bg-teal-deep px-2 py-1 text-sm text-white">
                  <button type="button" aria-label={`Tirar ${p.name}`} onClick={() => setPositionIds((cur) => cur.filter((x) => x !== p.id))}><X size={12} /></button>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
          <ModalField label="Risco" required>
            <input className="input" placeholder="Pesquisar risco…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </ModalField>
          <div className="max-h-52 overflow-y-auto rounded-md border border-line">
            {shown.map((h) => (
              <label key={h.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-paper">
                <input type="checkbox" checked={hazardIds.includes(h.id)} onChange={() => toggle(hazardIds, setHazardIds, h.id)} />
                <span>{h.name}</span>
                <span className="text-xs text-ink-muted">{RISK_CATEGORY_LABEL[h.category]}</span>
              </label>
            ))}
            {shown.length === 0 && <p className="p-3 text-xs text-ink-muted">Nenhum risco cadastrado. Cadastre em Segurança › Riscos.</p>}
          </div>
        </div>
        <div className="flex flex-col gap-4">
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
      </div>
    </FormModal>
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
