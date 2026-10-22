import { FormEvent, useState } from "react";
import { Layers, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { api } from "../../lib/api";
import {
  MATRIX_CLASSIFICATION,
  MATRIX_LEVEL_COLOR,
  MATRIX_LEVEL_LABEL,
  PROBABILITY_OPTIONS,
  SEVERITY_OPTIONS,
  clampScale,
  riskLevelOf,
} from "../../lib/risk-matrix";
import { ImportPgrRisksWizard } from "../ImportPgrRisksWizard";
import type {
  EvaluationCriteria,
  ExposureType,
  Ghe,
  Hazard,
  PgrDetail,
  PgrRisk,
  RiskCategory,
  YesNo,
} from "../../lib/types";

const RISK_LEVEL_STYLE: Record<string, string> = {
  LOW: "bg-teal-tint text-teal-deep",
  MEDIUM: "bg-amber-tint text-amber",
  HIGH: "bg-amber-tint text-amber",
  CRITICAL: "bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] text-amber",
  IRRELEVANT: "bg-teal-tint text-teal-deep",
};
const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  IRRELEVANT: "Irrelevante",
};
const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ERGONOMICO: "Ergonômico",
  ACIDENTE: "Acidente",
};
const EXPOSURE_TYPE_LABEL: Record<ExposureType, string> = {
  HABITUAL: "Habitual",
  EVENTUAL: "Eventual",
  INTERMITENTE: "Intermitente",
  PERMANENTE: "Permanente",
};
const EXPOSURE_TYPE_HELP: Record<ExposureType, string> = {
  HABITUAL: "faz parte da rotina.",
  EVENTUAL: "acontece ocasionalmente.",
  INTERMITENTE: "ocorre com frequência, mas alterna com períodos sem exposição.",
  PERMANENTE: "exposição contínua durante a atividade.",
};
const EXPOSURE_PROFILE_TEMPLATE = [
  "Agente: ",
  "Atividade e local: ",
  "Frequência: ",
  "Duração: ",
  "Intensidade ou concentração: ",
  "Via de contato: ",
  "Controles existentes: ",
].join("\n");
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
          onHazardsChanged={onChanged}
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
          onHazardsChanged={onChanged}
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
  onUpdated,
  onDeleted,
}: {
  hazards: Hazard[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (hazard: Hazard) => void;
  onUpdated: (hazard: Hazard) => void;
  onDeleted: (id: string) => void;
}) {
  const [mode, setMode] = useState<"select" | "create" | "edit">("select");
  const [category, setCategory] = useState<RiskCategory>("FISICO");
  const [name, setName] = useState("");
  const [esocialCode, setEsocialCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = hazards.find((h) => h.id === value);

  const grouped = (Object.keys(RISK_CATEGORY_LABEL) as RiskCategory[]).map((cat) => ({
    cat,
    items: hazards.filter((h) => h.category === cat),
  }));

  function startCreate() {
    setCategory("FISICO");
    setName("");
    setEsocialCode("");
    setError(null);
    setMode("create");
  }
  function startEdit() {
    if (!selected) return;
    setCategory(selected.category);
    setName(selected.name);
    setEsocialCode(selected.esocialCode ?? "");
    setError(null);
    setMode("edit");
  }

  async function handleSave() {
    if (name.trim().length < 2 || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === "edit" && selected) {
        const updated = await api.patch<Hazard>(`/pgr/hazards/${selected.id}`, {
          category,
          name: name.trim(),
          esocialCode: esocialCode.trim() || undefined,
        });
        onUpdated(updated);
      } else {
        const created = await api.post<Hazard>("/pgr/hazards", {
          category,
          name: name.trim(),
          esocialCode: esocialCode || undefined,
        });
        onCreated(created);
        onChange(created.id);
      }
      setMode("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar o perigo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Excluir o perigo "${selected.name}" da lista?`)) return;
    setError(null);
    try {
      await api.del(`/pgr/hazards/${selected.id}`);
      onDeleted(selected.id);
      onChange("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir o perigo.");
    }
  }

  if (mode !== "select") {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">{mode === "edit" ? "Editar perigo/fator de risco" : "Novo perigo/fator de risco"}</span>
        <div className="flex flex-wrap gap-1.5">
          <select className="input w-40" value={category} onChange={(e) => setCategory(e.target.value as RiskCategory)}>
            {(Object.keys(RISK_CATEGORY_LABEL) as RiskCategory[]).map((c) => (
              <option key={c} value={c}>{RISK_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
          <input className="input min-w-[160px] flex-1" placeholder="Nome do perigo" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input w-32" placeholder="Cód. eSocial" value={esocialCode} onChange={(e) => setEsocialCode(e.target.value)} />
          <button type="button" disabled={saving} onClick={handleSave} className="btn-primary shrink-0 px-3 text-xs">
            {saving ? "…" : mode === "edit" ? "Salvar" : "Criar"}
          </button>
          <button type="button" className="btn-secondary shrink-0 px-3 text-xs" onClick={() => setMode("select")}>
            X
          </button>
        </div>
        {error && <p className="text-xs text-amber" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor="hazard-select" className="text-ink-muted">Perigo/Fator de Risco</label>
      <div className="flex items-center gap-1.5">
        <select
          id="hazard-select"
          className="input min-w-0 flex-1"
          value={value}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              startCreate();
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
        <button
          type="button"
          onClick={startEdit}
          disabled={!selected}
          title="Editar o perigo selecionado"
          aria-label="Editar perigo selecionado"
          className="rounded-md border border-line p-2 text-ink-muted hover:bg-teal-tint hover:text-ink disabled:opacity-40"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!selected}
          title="Excluir o perigo selecionado"
          aria-label="Excluir perigo selecionado"
          className="rounded-md border border-line p-2 text-ink-muted hover:bg-danger-tint hover:text-danger disabled:opacity-40"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {error && <p className="text-xs text-amber" role="alert">{error}</p>}
    </div>
  );
}

const LEVEL_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "IRRELEVANT"];
const LEVEL_BAR: Record<string, string> = {
  CRITICAL: "bg-danger",
  HIGH: "bg-amber",
  MEDIUM: "bg-[color-mix(in_srgb,var(--amber)_45%,transparent)]",
  LOW: "bg-teal",
  IRRELEVANT: "bg-teal-deep",
};
const LEVEL_BADGE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-amber-tint text-amber",
  MEDIUM: "bg-amber-tint text-amber",
  LOW: "bg-teal-tint text-teal-deep",
  IRRELEVANT: "bg-teal-tint text-teal-deep",
};
const CATEGORY_CHIP: Record<RiskCategory, string> = {
  FISICO: "bg-teal-tint text-teal-deep",
  QUIMICO: "bg-amber-tint text-amber",
  BIOLOGICO: "bg-teal-tint text-teal-deep",
  ERGONOMICO: "bg-line text-ink-muted",
  ACIDENTE: "bg-danger-tint text-danger",
};

/** Tabela de referência (4x4) com a célula escolhida em destaque. */
function RiskMatrix({ probability, severity }: { probability: number; severity: number }) {
  const rows = [1, 2, 3, 4];
  return (
    <div className="text-center text-xs" aria-label="Matriz de classificação do risco">
      <p className="mb-1 font-display text-[11px] font-bold uppercase tracking-wide text-ink-muted">Severidade / potencial de dano</p>
      <div className="inline-flex gap-1.5">
        <div className="flex items-center">
          <span className="font-display text-[11px] font-bold uppercase tracking-wide text-ink-muted [writing-mode:vertical-rl] rotate-180">
            Frequência / probabilidade
          </span>
        </div>
        <div>
          <div className="mb-1 flex gap-0.5 pl-0">
            {rows.map((c) => (
              <span key={c} className="w-16 py-0.5 font-semibold text-ink-muted">{c}</span>
            ))}
          </div>
          {rows.map((p) => (
            <div key={p} className="mb-0.5 flex items-center gap-0.5">
              {rows.map((c) => {
                const lvl = riskLevelOf(p, c);
                const on = p === probability && c === severity;
                return (
                  <div
                    key={c}
                    className={`flex h-14 w-16 flex-col items-center justify-center rounded-sm font-medium leading-tight text-black ${on ? "ring-2 ring-ink ring-offset-1" : "opacity-70"}`}
                    style={{ background: MATRIX_LEVEL_COLOR[lvl] }}
                  >
                    <span className="text-sm">{p * c}</span>
                    <span>{MATRIX_LEVEL_LABEL[lvl]}</span>
                  </div>
                );
              })}
              <span className="w-4 pl-1 font-semibold text-ink-muted">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Contagem de riscos por nível, em cinco quadros coloridos. */
function RiskSummary({ risks }: { risks: PgrRisk[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
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
            <dd className="truncate text-ink">{MATRIX_CLASSIFICATION[risk.riskLevel] ?? risk.classification ?? "A definir"}</dd>
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
  onHazardsChanged,
}: {
  pgrId: string;
  ghes: Ghe[];
  hazards: Hazard[];
  risk?: PgrRisk;
  onClose: () => void;
  onSaved: () => void;
  onHazardsChanged: () => void;
}) {
  const [hazardList, setHazardList] = useState(hazards);
  const [gheId, setGheId] = useState(risk?.gheId ?? ghes[0]?.id ?? "");
  const [hazardId, setHazardId] = useState(risk?.hazardId ?? "");
  const [description, setDescription] = useState(risk?.description ?? "");
  const [legalBasis, setLegalBasis] = useState(risk?.legalBasis ?? "");
  const [exposureTime, setExposureTime] = useState(risk?.exposureTime ?? "");
  const [usesEpc, setUsesEpc] = useState<YesNo | "">(risk?.usesEpc ?? "");
  const [epcEffective, setEpcEffective] = useState<YesNo | "">(risk?.epcEffective ?? "");
  const [usesEpi, setUsesEpi] = useState<YesNo | "">(risk?.usesEpi ?? "");
  const [epiEffective, setEpiEffective] = useState<YesNo | "">(risk?.epiEffective ?? "");
  const [requiredActions, setRequiredActions] = useState(risk?.requiredActions ?? "");
  const [guidance, setGuidance] = useState(risk?.guidance ?? "");
  const [typicalInjuries, setTypicalInjuries] = useState(risk?.typicalInjuries ?? "");
  const [sourceCircumstances, setSourceCircumstances] = useState(risk?.sourceCircumstances ?? "");
  const [propagationMeans, setPropagationMeans] = useState(risk?.propagationMeans ?? "");
  const [exposureType, setExposureType] = useState<ExposureType | "">(risk?.exposureType ?? "");
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriteria | "">(risk?.evaluationCriteria ?? "QUALITATIVO");
  const [exposureProfile, setExposureProfile] = useState(risk?.exposureProfile ?? "");
  const [probability, setProbability] = useState(clampScale(risk?.probability ?? 2));
  const [severity, setSeverity] = useState(clampScale(risk?.severity ?? 2));
  const level = riskLevelOf(probability, severity);
  // "Ausência de agentes…" é uma declaração de inexistência: não pede detalhes, avaliação nem medidas.
  const hazardName = hazardList.find((h) => h.id === hazardId)?.name ?? "";
  const isAbsence = /^aus.{1,2}ncia/i.test(hazardName.normalize("NFC").trim());
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
      // Campo vazio vira null: assim, apagar um texto no formulário também apaga no risco já salvo.
      const t = (v: string) => v.trim() || null;
      const payload = isAbsence
        ? {
            gheId,
            hazardId,
            description: null,
            legalBasis: null,
            typicalInjuries: null,
            sourceCircumstances: null,
            propagationMeans: null,
            exposureTime: null,
            exposureProfile: null,
            probability: 1,
            severity: 1,
            conclusion: null,
            adminControls: null,
            engineeringControls: null,
            epcMeasures: null,
            epiMeasures: null,
            usesEpc: null,
            epcEffective: null,
            usesEpi: null,
            epiEffective: null,
            requiredActions: null,
            guidance: null,
          }
        : {
            gheId,
            hazardId,
            description: t(description),
            legalBasis: t(legalBasis),
            typicalInjuries: t(typicalInjuries),
            sourceCircumstances: t(sourceCircumstances),
            propagationMeans: t(propagationMeans),
            exposureTime: t(exposureTime),
            exposureType: exposureType || null,
            evaluationCriteria: evaluationCriteria || null,
            exposureProfile: t(exposureProfile),
            probability,
            severity,
            conclusion: t(conclusion),
            adminControls: t(adminControls),
            engineeringControls: t(engineeringControls),
            epcMeasures: t(epcMeasures),
            epiMeasures: t(epiMeasures),
            usesEpc: usesEpc || null,
            epcEffective: epcEffective || null,
            usesEpi: usesEpi || null,
            epiEffective: epiEffective || null,
            requiredActions: t(requiredActions),
            guidance: t(guidance),
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
            onUpdated={(h) => {
              setHazardList((prev) => prev.map((x) => (x.id === h.id ? h : x)));
              onHazardsChanged();
            }}
            onDeleted={(id) => setHazardList((prev) => prev.filter((x) => x.id !== id))}
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
            onUpdated={(h) => {
              setHazardList((prev) => prev.map((x) => (x.id === h.id ? h : x)));
              onHazardsChanged();
            }}
            onDeleted={(id) => setHazardList((prev) => prev.filter((x) => x.id !== id))}
          />
          {!isAbsence && (
            <>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-muted">Descrição</span>
            <textarea
              className="input min-h-[64px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={hazardList.find((h) => h.id === hazardId)?.description ?? "Descreva o perigo neste GHE"}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-muted">Fundamentação legal</span>
            <textarea
              className="input min-h-[64px] resize-y"
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              placeholder='ex.: NR17 "Ergonomia" item 17.5 — levantamento, transporte e descarga individual de cargas'
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink-muted">Possíveis lesões ou agravos à saúde</span>
            <textarea className="input min-h-[56px] resize-y" value={typicalInjuries} onChange={(e) => setTypicalInjuries(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Fontes ou circunstâncias</span>
            <input className="input" value={sourceCircumstances} onChange={(e) => setSourceCircumstances(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Meio de propagação</span>
            <input className="input" value={propagationMeans} onChange={(e) => setPropagationMeans(e.target.value)} placeholder="ex.: Pelo ar, Contato" />
          </label>
            </>
          )}
        </div>
      </div>

      {!isAbsence && (
      <div className="border-t border-line pt-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted">Avaliação</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Tempo de exposição</span>
            <input type="time" className="input" value={exposureTime} onChange={(e) => setExposureTime(e.target.value)} aria-label="Tempo de exposição" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Tipo de exposição</span>
            <select className="input" value={exposureType} onChange={(e) => setExposureType(e.target.value as ExposureType)}>
              <option value="">Não informado</option>
              {(Object.keys(EXPOSURE_TYPE_LABEL) as ExposureType[]).map((t) => (
                <option key={t} value={t}>{EXPOSURE_TYPE_LABEL[t]} — {EXPOSURE_TYPE_HELP[t]}</option>
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
        </div>

        <div className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="exposure-profile" className="text-ink-muted">Perfil de exposição</label>
            <button
              type="button"
              className="text-xs font-medium text-teal-deep hover:underline"
              onClick={() => setExposureProfile((cur) => (cur.trim() ? `${cur.trimEnd()}\n${EXPOSURE_PROFILE_TEMPLATE}` : EXPOSURE_PROFILE_TEMPLATE))}
            >
              Inserir roteiro
            </button>
          </div>
          <textarea
            id="exposure-profile"
            className="input min-h-[160px] resize-y"
            value={exposureProfile}
            onChange={(e) => setExposureProfile(e.target.value)}
            placeholder="Descreva a exposição — use “Inserir roteiro” para ver os tópicos."
          />
          <p className="text-xs text-ink-muted">
            Pode incluir: <strong>agente</strong> (ruído, poeira, produto químico, calor, risco biológico etc.), <strong>atividade e local</strong> (onde e durante qual tarefa ocorre),{" "}
            <strong>frequência</strong> (habitual, intermitente ou eventual), <strong>duração</strong> (quanto dura cada contato e por quanto tempo se repete),{" "}
            <strong>intensidade ou concentração</strong> (nível medido ou estimado), <strong>via de contato</strong> (inalação, pele, ingestão ou outra) e{" "}
            <strong>controles existentes</strong> (ventilação, equipamento de proteção, isolamento ou procedimentos).
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Probabilidade / frequência (1-4)</span>
              <select className="input" value={clampScale(probability)} onChange={(e) => setProbability(Number(e.target.value))}>
                {PROBABILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Severidade / potencial de dano (1-4)</span>
              <select className="input" value={clampScale(severity)} onChange={(e) => setSeverity(Number(e.target.value))}>
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-ink-muted">Nível de risco e classificação (calculados)</span>
              <div
                className="flex items-center justify-between rounded-md border border-line px-3 py-2.5 font-display font-semibold text-black"
                style={{ background: MATRIX_LEVEL_COLOR[level] }}
                aria-live="polite"
              >
                <span>
                  Risco {MATRIX_LEVEL_LABEL[level]} · {MATRIX_CLASSIFICATION[level]}
                </span>
                <span className="text-sm font-medium">{clampScale(probability)} × {clampScale(severity)} = {clampScale(probability) * clampScale(severity)}</span>
              </div>
              <p className="text-xs text-ink-muted">O nível de risco e a classificação são calculados pela matriz ao lado a partir da probabilidade e da severidade.</p>
            </div>
          </div>
          <RiskMatrix probability={clampScale(probability)} severity={clampScale(severity)} />
        </div>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Conclusão</span>
          <textarea className="input min-h-[70px] resize-y" value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
        </label>
      </div>
      )}

      {!isAbsence && (
      <div className="border-t border-line pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Prevenção e controle</p>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              ["Utiliza EPC", usesEpc, setUsesEpc],
              ["EPC eficaz", epcEffective, setEpcEffective],
              ["Utiliza EPI", usesEpi, setUsesEpi],
              ["EPI eficaz", epiEffective, setEpiEffective],
            ] as const
          ).map(([label, value, set]) => (
            <label key={label} className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">{label}</span>
              <select className="input" value={value} onChange={(e) => set(e.target.value as YesNo | "")}>
                <option value="">Não se aplica</option>
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </label>
          ))}
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
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Ações necessárias</span>
            <textarea className="input min-h-[60px] resize-y" value={requiredActions} onChange={(e) => setRequiredActions(e.target.value)} placeholder="ex.: Treinamento de NR17 - Ergonomia" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Orientação</span>
            <textarea className="input min-h-[60px] resize-y" value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder="ex.: Campanha de conscientização; capacitação antes do início das atividades" />
          </label>
        </div>
      </div>
      )}

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
