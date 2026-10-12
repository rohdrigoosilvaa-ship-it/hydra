import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { api } from "../../lib/api";
import { EvidenceUploader } from "../EvidenceUploader";
import type {
  InspectionDetail,
  InspectionResponseValue,
  InspectionTemplate,
  InspectionTemplateItem,
  NonConformitySeverity,
} from "../../lib/types";

type Step = "select" | "running" | "done";

export function NewInspectionTab({ companyId, onFinished }: { companyId?: string; onFinished: () => void }) {
  const [step, setStep] = useState<Step>("select");
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [index, setIndex] = useState(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const path = companyId ? `/field-ops/inspection-templates?companyId=${encodeURIComponent(companyId)}` : "/field-ops/inspection-templates";
    api.get<InspectionTemplate[]>(path).then((all) => {
      const list = all.filter((t) => t.status === "ATIVO"); // só modelos ativos podem ser aplicados
      setTemplates(list);
      if (list[0]) setTemplateId(list[0].id);
    });
  }, [companyId]);

  async function handleStart() {
    if (!companyId || !templateId) return;
    setStarting(true);
    try {
      const created = await api.post<InspectionDetail>("/field-ops/inspections", { companyId, templateId });
      const full = await api.get<InspectionDetail>(`/field-ops/inspections/${created.id}`);
      setInspection(full);
      setIndex(0);
      setStep("running");
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete() {
    if (!inspection) return;
    await api.patch(`/field-ops/inspections/${inspection.id}`, { status: "CONCLUIDA" });
    setStep("done");
  }

  if (step === "select") {
    return (
      <div className="card max-w-md">
        <p className="font-medium text-ink">Escolha um modelo para começar</p>
        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Nenhum modelo ativo — crie e ative um em CheckHub › Criar Checklist.</p>
        ) : (
          <>
            <select className="input mt-3 w-full" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.items.length} itens)</option>
              ))}
            </select>
            <button
              onClick={handleStart}
              disabled={starting || !companyId}
              className="btn-primary mt-3 w-full"
            >
              {starting ? "Iniciando…" : "Iniciar inspeção"}
            </button>
            {!companyId && <p className="mt-2 text-xs text-amber">Selecione uma empresa no filtro do topo para iniciar.</p>}
          </>
        )}
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="card flex max-w-md flex-col items-center gap-2 py-8 text-center">
        <CheckCircle2 size={32} className="text-teal-deep" />
        <p className="font-medium text-ink">Inspeção concluída!</p>
        <button className="btn-secondary mt-2" onClick={onFinished}>Ver inspeções realizadas</button>
      </div>
    );
  }

  if (!inspection) return null;
  const items = inspection.template.items;
  const item = items[index];
  const response = inspection.responses.find((r) => r.templateItemId === item?.id);

  return (
    <div className="max-w-md">
      <p className="text-xs text-ink-muted">
        Item {index + 1} de {items.length} · {inspection.template.name}
      </p>
      {item && (
        <ChecklistItem
          key={item.id}
          inspectionId={inspection.id}
          templateItemId={item.id}
          text={item.text}
          blockLabel={item.blockLabel}
          category={item.category}
          item={item}
          autoNonConformity={inspection.template.ncCreation === "AUTOMATICA"}
          initialValue={response?.value ?? null}
          initialTextValue={response?.textValue ?? ""}
          initialComment={response?.comment ?? ""}
          companyId={companyId}
        />
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="btn-secondary flex items-center gap-1 text-sm disabled:opacity-40"
        >
          <ChevronLeft size={15} /> Anterior
        </button>
        {index < items.length - 1 ? (
          <button onClick={() => setIndex((i) => i + 1)} className="btn-primary flex items-center gap-1 text-sm">
            Próximo <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={handleComplete} className="btn-primary flex items-center gap-1 text-sm">
            <CheckCircle2 size={15} /> Concluir inspeção
          </button>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  inspectionId,
  templateItemId,
  text,
  blockLabel,
  category,
  item,
  autoNonConformity,
  initialValue,
  initialTextValue,
  initialComment,
  companyId,
}: {
  inspectionId: string;
  templateItemId: string;
  text: string;
  blockLabel: string | null;
  category: string | null;
  item: InspectionTemplateItem;
  autoNonConformity: boolean;
  initialValue: InspectionResponseValue | null;
  initialTextValue: string;
  initialComment: string;
  companyId?: string;
}) {
  const { responseType, allowPhoto, options } = item;
  // Modelos antigos guardam a resposta de texto no comentário; os novos tipos usam o campo próprio de resposta.
  const legacyText = responseType === "TEXTO_LIVRE";
  const [value, setValue] = useState<InspectionResponseValue | null>(initialValue);
  const [answer, setAnswer] = useState(initialTextValue);
  const [comment, setComment] = useState(initialComment);
  const [showNcForm, setShowNcForm] = useState(false);
  const [ncDescription, setNcDescription] = useState("");
  const [ncSeverity, setNcSeverity] = useState<NonConformitySeverity>("MEDIA");
  const [ncSaved, setNcSaved] = useState(false);
  const selected = answer ? answer.split(",").filter(Boolean) : [];

  function save(patch: { value?: InspectionResponseValue; textValue?: string; comment?: string }) {
    return api.post(`/field-ops/inspections/${inspectionId}/responses`, { templateItemId, ...patch });
  }

  async function saveAnswer(next: string) {
    setAnswer(next);
    await save({ textValue: next, comment: comment || undefined });
  }

  async function toggleOption(option: string) {
    const next =
      responseType === "SELECAO_UNICA"
        ? [option]
        : selected.includes(option)
          ? selected.filter((o) => o !== option)
          : [...selected, option];
    await saveAnswer(next.join(","));
  }

  async function createNonConformity(description: string, severity: NonConformitySeverity) {
    if (!companyId) return;
    await api.post("/field-ops/non-conformities", { companyId, inspectionId, description, severity });
    setNcSaved(true);
  }

  async function saveResponse(nextValue: InspectionResponseValue) {
    setValue(nextValue);
    await save({ value: nextValue, comment: comment || undefined });
    if (nextValue === "NAO_CONFORME" && item.allowActionPlan) {
      if (autoNonConformity) await createNonConformity(text, "MEDIA"); // o modelo manda registrar sozinho
      else {
        setShowNcForm(true);
        setNcDescription(text);
      }
    }
  }

  async function saveComment() {
    await save({
      value: value ?? undefined,
      textValue: legacyText ? undefined : answer || undefined,
      comment: comment || undefined,
    });
  }

  async function handleSaveNonConformity() {
    await createNonConformity(ncDescription, ncSeverity);
  }

  const optionButton = (on: boolean, danger = false) =>
    `rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
      on ? (danger ? "border-danger bg-danger-tint text-danger" : "border-teal bg-teal-tint text-teal-deep") : "border-line text-ink-muted"
    }`;

  return (
    <div className="card mt-2">
      {blockLabel && <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-teal-deep">{blockLabel}</p>}
      {category && <p className="mb-1 text-xs font-semibold text-ink-muted">{category}</p>}
      <p className="font-medium text-ink">
        {text} {item.required && <span className="text-danger" title="Resposta obrigatória">*</span>}
      </p>
      {item.instruction && <p className="mt-0.5 text-xs text-ink-muted">{item.instruction}</p>}

      {legacyText && (
        <textarea className="input mt-3 w-full" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} onBlur={saveComment} />
      )}
      {responseType === "TEXTO_CURTO" && (
        <input className="input mt-3 w-full" value={answer} onChange={(e) => setAnswer(e.target.value)} onBlur={() => saveAnswer(answer)} />
      )}
      {responseType === "TEXTO_LONGO" && (
        <textarea className="input mt-3 w-full" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} onBlur={() => saveAnswer(answer)} />
      )}
      {(responseType === "NUMERO" || responseType === "NOTA") && (
        <input type="number" className="input mt-3 w-full" value={answer} onChange={(e) => setAnswer(e.target.value)} onBlur={() => saveAnswer(answer)} />
      )}
      {responseType === "DATA" && (
        <input type="date" className="input mt-3 w-full" value={answer} onChange={(e) => saveAnswer(e.target.value)} />
      )}
      {responseType === "HORA" && (
        <input type="time" className="input mt-3 w-full" value={answer} onChange={(e) => saveAnswer(e.target.value)} />
      )}
      {responseType === "ESCALA" && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: (item.scaleMax ?? 5) - (item.scaleMin ?? 1) + 1 }, (_, i) => String((item.scaleMin ?? 1) + i)).map((n) => (
            <button key={n} onClick={() => saveAnswer(n)} className={`${optionButton(answer === n)} w-11 px-0`}>
              {n}
            </button>
          ))}
        </div>
      )}
      {(responseType === "SELECAO_MULTIPLA" || responseType === "SELECAO_UNICA") && (
        <div className="mt-3 flex flex-col gap-1.5">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink">
              <input
                type={responseType === "SELECAO_UNICA" ? "radio" : "checkbox"}
                name={`opt-${templateItemId}`}
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
      {(responseType === "CONFORME_NAO_CONFORME" || responseType === "SIM_NAO") && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => saveResponse("CONFORME")} className={`flex-1 ${optionButton(value === "CONFORME")}`}>
            {responseType === "SIM_NAO" ? "Sim" : "Conforme"}
          </button>
          <button onClick={() => saveResponse("NAO_CONFORME")} className={`flex-1 ${optionButton(value === "NAO_CONFORME", true)}`}>
            {responseType === "SIM_NAO" ? "Não" : "Não conforme"}
          </button>
          {responseType === "CONFORME_NAO_CONFORME" && (
            <button
              onClick={() => saveResponse("NAO_APLICAVEL")}
              className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                value === "NAO_APLICAVEL" ? "border-ink bg-line text-ink" : "border-line text-ink-muted"
              }`}
            >
              N/A
            </button>
          )}
        </div>
      )}

      {!legacyText && item.allowComment && (
        <textarea
          className="input mt-3 w-full"
          rows={2}
          placeholder="Comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={saveComment}
        />
      )}

      {showNcForm && !ncSaved && (
        <div className="mt-3 rounded-md border-l-2 border-danger bg-danger-tint p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
            <TriangleAlert size={13} /> Registrar não conformidade
          </p>
          <textarea className="input mt-2 w-full" rows={2} value={ncDescription} onChange={(e) => setNcDescription(e.target.value)} />
          <select className="input mt-2 w-full" value={ncSeverity} onChange={(e) => setNcSeverity(e.target.value as NonConformitySeverity)}>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
          <button onClick={handleSaveNonConformity} className="btn-primary mt-2 w-full text-sm">
            Salvar não conformidade
          </button>
        </div>
      )}
      {ncSaved && <p className="mt-2 text-xs text-teal-deep">Não conformidade registrada — plano de ação criado.</p>}

      {allowPhoto && (
        <div className="mt-3 border-t border-line pt-3">
          <EvidenceUploader sourceType="INSPECTION_ITEM_RESPONSE" sourceId={`${inspectionId}:${templateItemId}`} companyId={companyId} />
        </div>
      )}
    </div>
  );
}
