import { FormEvent, useState } from "react";
import { Pencil, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
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
import { AI_DISCLAIMER, AiSuggestButton } from "./pgr-shared";

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
      <div className="mt-3 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Grupo</th>
              <th className="px-4 py-3 font-medium">Perigo/Fator de Risco</th>
              <th className="px-4 py-3 font-medium">GHE</th>
              <th className="px-4 py-3 font-medium">Prob. × Sev.</th>
              <th className="px-4 py-3 font-medium">Nível</th>
              <th className="px-4 py-3 font-medium">Classificação</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pgr.risks.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-ink-muted" colSpan={7}>
                  Nenhum risco avaliado ainda.
                </td>
              </tr>
            )}
            {pgr.risks.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-none">
                <td className="px-4 py-3 text-ink-muted">{RISK_CATEGORY_LABEL[r.hazard.category]}</td>
                <td className="px-4 py-3 text-ink">{r.hazard.name}</td>
                <td className="px-4 py-3 text-ink-muted">{r.ghe.name}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">
                  {r.probability} × {r.severity}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLE[r.riskLevel]}`}>
                    {RISK_LEVEL_LABEL[r.riskLevel]}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{r.classification ?? "A definir"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setEditingRisk(r)}
                      className="flex items-center gap-1 text-xs text-teal-deep hover:underline"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteRisk(r)}
                      className="flex items-center gap-1 text-xs text-amber hover:underline"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Sugestão de perigos/fatores de risco via IA a partir da atividade do GHE — cada
 * sugestão só vira um Hazard de verdade quando o usuário clica "Usar este perigo". */
function HazardAiSuggestions({
  activityDescription,
  existingHazards,
  onCreated,
  onSelect,
}: {
  activityDescription: string;
  existingHazards: Hazard[];
  onCreated: (hazard: Hazard) => void;
  onSelect: (id: string) => void;
}) {
  type Suggestion = { name: string; category: RiskCategory; description: string; damagePotential: string };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [usingIndex, setUsingIndex] = useState<number | null>(null);
  const disabledReason = activityDescription.trim().length < 5 ? "Preencha a descrição da atividade do GHE primeiro." : undefined;

  async function handleFetch() {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      const res = await api.post<{ suggestions: Suggestion[] }>("/pgr/ai/suggest-hazards", { activityDescription });
      setSuggestions(res.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao consultar a IA.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUse(index: number, s: Suggestion) {
    const existing = existingHazards.find(
      (h) => h.category === s.category && h.name.trim().toLowerCase() === s.name.trim().toLowerCase(),
    );
    if (existing) {
      onSelect(existing.id);
      return;
    }
    setUsingIndex(index);
    try {
      const created = await api.post<Hazard>("/pgr/hazards", {
        category: s.category,
        name: s.name,
        description: s.description || undefined,
        damagePotential: s.damagePotential || undefined,
      });
      onCreated(created);
      onSelect(created.id);
    } finally {
      setUsingIndex(null);
    }
  }

  return (
    <div className="sm:col-span-2">
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !!disabledReason}
        title={disabledReason}
        className="flex items-center gap-1 text-xs text-teal-deep hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={12} /> {loading ? "Consultando IA…" : "Sugerir perigos com IA"}
      </button>
      {error && <p className="mt-1 text-xs text-amber">{error}</p>}
      {suggestions && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-teal-deep">{AI_DISCLAIMER}</p>
          {suggestions.length === 0 && <p className="text-xs text-ink-muted">Nenhuma sugestão retornada.</p>}
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-md border border-teal-deep/30 bg-teal-tint p-2 text-sm">
              <p className="text-ink">
                <span className="font-medium">{s.name}</span>{" "}
                <span className="font-mono text-[10px] text-ink-muted">({RISK_CATEGORY_LABEL[s.category]})</span>
              </p>
              {s.description && <p className="text-ink-muted">{s.description}</p>}
              {s.damagePotential && <p className="mt-0.5 text-xs text-ink-muted">Potencial de dano: {s.damagePotential}</p>}
              <button
                type="button"
                onClick={() => handleUse(i, s)}
                disabled={usingIndex === i}
                className="mt-1 text-xs font-medium text-teal-deep hover:underline disabled:opacity-50"
              >
                {usingIndex === i ? "Usando…" : "Usar este perigo"}
              </button>
            </div>
          ))}
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

  const selectedGhe = ghes.find((g) => g.id === gheId);
  const selectedHazard = hazardList.find((h) => h.id === hazardId);
  const hazardDisabledReason = !selectedHazard ? "Selecione um perigo/fator de risco primeiro." : undefined;

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
          <HazardAiSuggestions
            activityDescription={selectedGhe?.activityDescription ?? ""}
            existingHazards={hazardList}
            onCreated={(h) => setHazardList((prev) => [...prev, h])}
            onSelect={setHazardId}
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
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <AiSuggestButton<{ typicalInjuries: string }>
            label="Sugerir lesões/agravos com IA"
            disabledReason={hazardDisabledReason}
            onFetch={() =>
              api.post("/pgr/ai/suggest-consequences", {
                hazardName: selectedHazard?.name,
                category: selectedHazard?.category,
                activityDescription: selectedGhe?.activityDescription || undefined,
              })
            }
            onApply={(r) => setTypicalInjuries(r.typicalInjuries)}
            renderPreview={(r) => <p className="text-ink">{r.typicalInjuries}</p>}
          />
          <AiSuggestButton<{ sourceCircumstances: string; propagationMeans: string }>
            label="Sugerir fontes/propagação com IA"
            disabledReason={hazardDisabledReason}
            onFetch={() =>
              api.post("/pgr/ai/suggest-sources", {
                hazardName: selectedHazard?.name,
                category: selectedHazard?.category,
                activityDescription: selectedGhe?.activityDescription || undefined,
              })
            }
            onApply={(r) => {
              setSourceCircumstances(r.sourceCircumstances);
              setPropagationMeans(r.propagationMeans);
            }}
            renderPreview={(r) => (
              <div>
                <p className="text-ink">{r.sourceCircumstances}</p>
                <p className="mt-1 text-ink-muted">Propagação: {r.propagationMeans}</p>
              </div>
            )}
          />
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
        <AiSuggestButton<{ probability: number; severity: number; classification: string; justification: string }>
          label="Sugerir avaliação (prob./sev./classificação) com IA"
          disabledReason={hazardDisabledReason}
          onFetch={() =>
            api.post("/pgr/ai/evaluate-risk", {
              hazardName: selectedHazard?.name,
              category: selectedHazard?.category,
              activityDescription: selectedGhe?.activityDescription || undefined,
              exposureType: exposureType || undefined,
            })
          }
          onApply={(r) => {
            setProbability(r.probability);
            setSeverity(r.severity);
            setClassification(r.classification);
          }}
          renderPreview={(r) => (
            <div>
              <p className="text-ink">
                Probabilidade {r.probability} × Severidade {r.severity} — {r.classification}
              </p>
              <p className="mt-1 text-ink-muted">{r.justification}</p>
            </div>
          )}
        />
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Conclusão</span>
          <textarea className="input min-h-[70px] resize-y" value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
        </label>
      </div>

      <div className="border-t border-line pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Prevenção e controle</p>
          <AiSuggestButton<{
            adminControls: string;
            engineeringControls: string;
            epcMeasures: string;
            epiMeasures: string;
          }>
            label="Sugerir medidas de controle com IA"
            disabledReason={hazardDisabledReason}
            onFetch={() =>
              api.post("/pgr/ai/suggest-controls", {
                hazardName: selectedHazard?.name,
                category: selectedHazard?.category,
                activityDescription: selectedGhe?.activityDescription || undefined,
                exposureType: exposureType || undefined,
                riskLevel: classification || undefined,
              })
            }
            onApply={(r) => {
              setAdminControls(r.adminControls);
              setEngineeringControls(r.engineeringControls);
              setEpcMeasures(r.epcMeasures);
              setEpiMeasures(r.epiMeasures);
            }}
            renderPreview={(r) => (
              <div className="flex flex-col gap-1.5">
                {r.adminControls && <p className="text-ink"><span className="font-medium">Administrativas:</span> {r.adminControls}</p>}
                {r.engineeringControls && <p className="text-ink"><span className="font-medium">Engenharia:</span> {r.engineeringControls}</p>}
                {r.epcMeasures && <p className="text-ink"><span className="font-medium">EPC:</span> {r.epcMeasures}</p>}
                {r.epiMeasures && <p className="text-ink"><span className="font-medium">EPI:</span> {r.epiMeasures}</p>}
              </div>
            )}
          />
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
