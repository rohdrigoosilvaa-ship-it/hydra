import { FormEvent, useState } from "react";
import { Layers, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { api } from "../../lib/api";
import { ImportPgrRisksWizard } from "../ImportPgrRisksWizard";
import type {
  EvaluationCriteria,
  ExposureType,
  Ghe,
  Hazard,
  PgrDetail,
  PgrRisk,
  RiskCategory,
} from "../../lib/types";

const RISK_LEVEL_STYLE: Record<string, string> = {
  LOW: "bg-teal-tint text-teal-deep",
  MEDIUM: "bg-amber-tint text-amber",
  HIGH: "bg-amber-tint text-amber",
  CRITICAL: "bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] text-amber",
};
const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};
const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};
const EXPOSURE_TYPE_LABEL: Record<ExposureType, string> = {
  EVENTUAL: "Eventual",
  INTERMITENTE: "Intermitente",
  PERMANENTE: "Permanente",
};
const EVALUATION_CRITERIA_LABEL: Record<EvaluationCriteria, string> = {
  QUALITATIVO: "Qualitativo",
  QUANTITATIVO: "Quantitativo",
};

export function PgrInventarioTab({
  pgr,
  hazards,
  onChanged,
}: {
  pgr: PgrDetail;
  hazards: Hazard[];
  onChanged: () => void;
}) {
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showRiskImport, setShowRiskImport] = useState(false);
  const [editingRisk, setEditingRisk] = useState<PgrRisk | null>(null);

  async function handleDeleteRisk(risk: PgrRisk) {
    if (!window.confirm(`Remover o risco "${risk.hazard.name}" do inventário?`)) return;
    await api.del(`/pgr/risks/${risk.id}`);
    onChanged();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Inventário de riscos</h2>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary flex items-center gap-1.5 text-xs"
            onClick={() => setShowRiskImport(true)}
          >
            <Upload size={13} /> Importar planilha
          </button>
          <button
            className="btn-secondary flex items-center gap-1.5 text-xs"
            onClick={() => setShowRiskForm(true)}
            disabled={pgr.ghes.length === 0}
          >
            <Plus size={13} /> Novo risco
          </button>
        </div>
      </div>
      {showRiskImport && (
        <ImportPgrRisksWizard
          pgrId={pgr.id}
          onClose={() => setShowRiskImport(false)}
          onImported={onChanged}
        />
      )}
      {showRiskForm && (
        <RiskForm
          pgrId={pgr.id}
          ghes={pgr.ghes}
          hazards={hazards}
          onClose={() => setShowRiskForm(false)}
          onSaved={() => {
            setShowRiskForm(false);
            onChanged();
          }}
        />
      )}
      {editingRisk && (
        <RiskForm
          pgrId={pgr.id}
          ghes={pgr.ghes}
          hazards={hazards}
          risk={editingRisk}
          onClose={() => setEditingRisk(null)}
          onSaved={() => {
            setEditingRisk(null);
            onChanged();
          }}
        />
      )}
      <RiskSummary risks={pgr.risks} />

      {pgr.risks.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
          Nenhum risco avaliado ainda. Use “Novo risco” ou “Importar planilha” para começar o inventário.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {pgr.ghes
            .filter((g) => pgr.risks.some((r) => r.gheId === g.id))
            .map((ghe) => {
              const risks = pgr.risks
                .filter((r) => r.gheId === ghe.id)
                .sort((a, b) => LEVEL_ORDER.indexOf(a.riskLevel) - LEVEL_ORDER.indexOf(b.riskLevel));
              return (
                <section key={ghe.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-tint text-teal-deep">
                      <Layers size={14} />
                    </span>
                    <h3 className="font-display text-sm font-semibold text-ink">{ghe.name}</h3>
                    <span className="rounded-full bg-line px-2 py-0.5 text-xs text-ink-muted">{risks.length} risco(s)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    {risks.map((r) => (
                      <RiskCard key={r.id} risk={r} onEdit={() => setEditingRisk(r)} onRemove={() => handleDeleteRisk(r)} />
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}

function HazardPicker({
  hazards,
  value,
  onChange,
  onCreated,
}: {
  hazards: Hazard[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (hazard: Hazard) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState<RiskCategory>("FISICO");
  const [name, setName] = useState("");
  const [esocialCode, setEsocialCode] = useState("");
  const [saving, setSaving] = useState(false);

  const grouped = (Object.keys(RISK_CATEGORY_LABEL) as RiskCategory[]).map((cat) => ({
    cat,
    items: hazards.filter((h) => h.category === cat),
  }));

  async function handleCreate() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const created = await api.post<Hazard>("/pgr/hazards", {
        category,
        name: name.trim(),
        esocialCode: esocialCode || undefined,
      });
      onCreated(created);
      onChange(created.id);
      setName("");
      setEsocialCode("");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Novo perigo/fator de risco</span>
        <div className="flex flex-wrap gap-1.5">
          <select className="input w-40" value={category} onChange={(e) => setCategory(e.target.value as RiskCategory)}>
            {(Object.keys(RISK_CATEGORY_LABEL) as RiskCategory[]).map((c) => (
              <option key={c} value={c}>{RISK_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
          <input className="input min-w-[160px] flex-1" placeholder="Nome do perigo" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input w-32" placeholder="Cód. eSocial" value={esocialCode} onChange={(e) => setEsocialCode(e.target.value)} />
          <button type="button" disabled={saving} onClick={handleCreate} className="btn-primary shrink-0 px-3 text-xs">
            {saving ? "…" : "Criar"}
          </button>
          <button type="button" className="btn-secondary shrink-0 px-3 text-xs" onClick={() => setCreating(false)}>
            X
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">Perigo/Fator de Risco</span>
      <select
        className="input"
        value={value}
        onChange={(e) => {
          if (e.target.value === "__new__") {
            setCreating(true);
            return;
          }
          onChange(e.target.value);
        }}
        required
      >
        <option value="">Selecione…</option>
        {grouped.map(({ cat, items }) =>
          items.length > 0 ? (
            <optgroup key={cat} label={RISK_CATEGORY_LABEL[cat]}>
              {items.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </optgroup>
          ) : null,
        )}
        <option value="__new__">+ Novo perigo…</option>
      </select>
    </label>
  );
}

const LEVEL_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const LEVEL_BAR: Record<string, string> = {
  CRITICAL: "bg-danger",
  HIGH: "bg-amber",
  MEDIUM: "bg-[color-mix(in_srgb,var(--amber)_45%,transparent)]",
  LOW: "bg-teal",
};
const LEVEL_BADGE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-amber-tint text-amber",
  MEDIUM: "bg-amber-tint text-amber",
  LOW: "bg-teal-tint text-teal-deep",
};
const CATEGORY_CHIP: Record<RiskCategory, string> = {
  FISICO: "bg-teal-tint text-teal-deep",
  QUIMICO: "bg-amber-tint text-amber",
  BIOLOGICO: "bg-teal-tint text-teal-deep",
  ERGONOMICO: "bg-line text-ink-muted",
  ACIDENTE: "bg-danger-tint text-danger",
};

/** Contagem de riscos por nível, em quatro quadros coloridos. */
function RiskSummary({ risks }: { risks: PgrRisk[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {LEVEL_ORDER.map((level) => {
        const count = risks.filter((r) => r.riskLevel === level).length;
        return (
          <div key={level} className="flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
            <span className={`h-full w-1.5 self-stretch ${LEVEL_BAR[level]}`} />
            <div className="py-3">
              <p className="font-display text-2xl font-semibold leading-none text-ink tabular-nums">{count}</p>
              <p className="mt-1 text-xs font-medium text-ink-muted">Risco {(RISK_LEVEL_LABEL[level] ?? level).toLowerCase()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RiskCard({ risk, onEdit, onRemove }: { risk: PgrRisk; onEdit: () => void; onRemove: () => void }) {
  return (
    <article className="flex overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
      <span className={`w-1.5 shrink-0 ${LEVEL_BAR[risk.riskLevel]}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_CHIP[risk.hazard.category]}`}>
            {RISK_CATEGORY_LABEL[risk.hazard.category]}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_BADGE[risk.riskLevel]}`}>
            {RISK_LEVEL_LABEL[risk.riskLevel]}
          </span>
        </div>
        <h4 className="font-medium text-ink">{risk.hazard.name}</h4>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-paper px-2.5 py-1.5">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Prob. × Sev.</dt>
            <dd className="font-mono tabular-nums text-ink">
              {risk.probability} × {risk.severity}
            </dd>
          </div>
          <div className="rounded-md bg-paper px-2.5 py-1.5">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Classificação</dt>
            <dd className="truncate text-ink">{risk.classification ?? "A definir"}</dd>
          </div>
        </dl>
        <div className="mt-auto flex justify-end gap-3 pt-1">
          <button onClick={onEdit} className="flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline">
            <Pencil size={12} /> Editar
          </button>
          <button onClick={onRemove} className="flex items-center gap-1 text-xs font-medium text-amber hover:underline">
            <Trash2 size={12} /> Remover
          </button>
        </div>
      </div>
    </article>
  );
}

function RiskForm({
  pgrId,
  ghes,
  hazards,
  risk,
  onClose,
  onSaved,
}: {
  pgrId: string;
  ghes: Ghe[];
  hazards: Hazard[];
  risk?: PgrRisk;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [hazardList, setHazardList] = useState(hazards);
  const [gheId, setGheId] = useState(risk?.gheId ?? ghes[0]?.id ?? "");
  const [hazardId, setHazardId] = useState(risk?.hazardId ?? "");
  const [typicalInjuries, setTypicalInjuries] = useState(risk?.typicalInjuries ?? "");
  const [sourceCircumstances, setSourceCircumstances] = useState(risk?.sourceCircumstances ?? "");
  const [propagationMeans, setPropagationMeans] = useState(risk?.propagationMeans ?? "");
  const [exposureType, setExposureType] = useState<ExposureType | "">(risk?.exposureType ?? "");
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriteria | "">(risk?.evaluationCriteria ?? "QUALITATIVO");
  const [exposureProfile, setExposureProfile] = useState(risk?.exposureProfile ?? "");
  const [probability, setProbability] = useState(risk?.probability ?? 3);
  const [severity, setSeverity] = useState(risk?.severity ?? 3);
  const [classification, setClassification] = useState(risk?.classification ?? "");
  const [conclusion, setConclusion] = useState(risk?.conclusion ?? "");
  const [adminControls, setAdminControls] = useState(risk?.adminControls ?? "");
  const [engineeringControls, setEngineeringControls] = useState(risk?.engineeringControls ?? "");
  const [epcMeasures, setEpcMeasures] = useState(risk?.epcMeasures ?? "");
  const [epiMeasures, setEpiMeasures] = useState(risk?.epiMeasures ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        gheId,
        hazardId,
        typicalInjuries: typicalInjuries || undefined,
        sourceCircumstances: sourceCircumstances || undefined,
        propagationMeans: propagationMeans || undefined,
        exposureType: exposureType || undefined,
        evaluationCriteria: evaluationCriteria || undefined,
        exposureProfile: exposureProfile || undefined,
        probability,
        severity,
        classification: classification || undefined,
        conclusion: conclusion || undefined,
        adminControls: adminControls || undefined,
        engineeringControls: engineeringControls || undefined,
        epcMeasures: epcMeasures || undefined,
        epiMeasures: epiMeasures || undefined,
      };
      if (risk) {
        await api.patch(`/pgr/risks/${risk.id}`, payload);
      } else {
        await api.post("/pgr/risks", { ...payload, pgrId });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (hazardList.length === 0 && !hazardId) {
    return (
      <div className="card mt-3">
        <p className="text-sm text-ink-muted">
          Nenhum perigo cadastrado ainda — use o campo "Perigo/Fator de Risco" abaixo para criar o primeiro.
        </p>
        <div className="mt-3">
          <HazardPicker
            hazards={hazardList}
            value={hazardId}
            onChange={setHazardId}
            onCreated={(h) => setHazardList((prev) => [...prev, h])}
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-3 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink-muted">
          {risk ? "Editar risco" : "Novo risco"}
        </h3>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>

      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted">Identificação</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">GHE</span>
            <select className="input" value={gheId} onChange={(e) => setGheId(e.target.value)} required>
              {ghes.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          <HazardPicker
            hazards={hazardList}
            value={hazardId}
            onChange={setHazardId}
            onCreated={(h) => setHazardList((prev) => [...prev, h])}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Possíveis lesões ou agravos à saúde</span>
            <input className="input" value={typicalInjuries} onChange={(e) => setTypicalInjuries(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Fontes ou circunstâncias</span>
            <input className="input" value={sourceCircumstances} onChange={(e) => setSourceCircumstances(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Meio de propagação</span>
            <input className="input" value={propagationMeans} onChange={(e) => setPropagationMeans(e.target.value)} placeholder="ex.: Pelo ar, Contato" />
          </label>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted">Avaliação</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Tipo de exposição</span>
            <select className="input" value={exposureType} onChange={(e) => setExposureType(e.target.value as ExposureType)}>
              <option value="">Não informado</option>
              {(Object.keys(EXPOSURE_TYPE_LABEL) as ExposureType[]).map((t) => (
                <option key={t} value={t}>{EXPOSURE_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Critério</span>
            <select className="input" value={evaluationCriteria} onChange={(e) => setEvaluationCriteria(e.target.value as EvaluationCriteria)}>
              {(Object.keys(EVALUATION_CRITERIA_LABEL) as EvaluationCriteria[]).map((c) => (
                <option key={c} value={c}>{EVALUATION_CRITERIA_LABEL[c]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Perfil de exposição</span>
            <input className="input" value={exposureProfile} onChange={(e) => setExposureProfile(e.target.value)} placeholder="ex.: Habitual e permanente" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Probabilidade (1-5)</span>
            <input type="number" min={1} max={5} className="input" value={probability} onChange={(e) => setProbability(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Severidade (1-5)</span>
            <input type="number" min={1} max={5} className="input" value={severity} onChange={(e) => setSeverity(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Classificação</span>
            <input className="input" value={classification} onChange={(e) => setClassification(e.target.value)} placeholder="ex.: Aceitável, Tolerável" />
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          O Nível de Risco é calculado automaticamente a partir de Probabilidade × Severidade.
        </p>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Conclusão</span>
          <textarea className="input min-h-[70px] resize-y" value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
        </label>
      </div>

      <div className="border-t border-line pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Prevenção e controle</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Medidas administrativas</span>
            <textarea className="input min-h-[60px] resize-y" value={adminControls} onChange={(e) => setAdminControls(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Medidas de engenharia</span>
            <textarea className="input min-h-[60px] resize-y" value={engineeringControls} onChange={(e) => setEngineeringControls(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">EPC</span>
            <textarea className="input min-h-[60px] resize-y" value={epcMeasures} onChange={(e) => setEpcMeasures(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">EPI</span>
            <textarea className="input min-h-[60px] resize-y" value={epiMeasures} onChange={(e) => setEpiMeasures(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving || !hazardId} className="btn-primary">
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
