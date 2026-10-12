import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { api } from "../../lib/api";
import { decodeItem, visibleOptions } from "../../lib/checklist-item-config";
import { EvidenceUploader } from "../EvidenceUploader";
import type {
  InspectionDetail,
  InspectionResponseValue,
  InspectionTemplate,
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
    api.get<InspectionTemplate[]>(path).then((list) => {
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
        <p className="font-medium text-ink">Escolha um roteiro para começar</p>
        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Nenhum roteiro cadastrado — crie um na aba "Modelos/Roteiros" primeiro.</p>
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
          allowPhoto={item.allowPhoto}
          responseType={item.responseType}
          options={item.options}
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
  allowPhoto,
  responseType,
  options,
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
  allowPhoto: boolean;
  responseType: string;
  options: string[];
  initialValue: InspectionResponseValue | null;
  initialTextValue: string;
  initialComment: string;
  companyId?: string;
}) {
  const cfg = decodeItem({ responseType: responseType as never, options, allowPhoto });
  const shownOptions = visibleOptions(options);
  const [value, setValue] = useState<InspectionResponseValue | null>(initialValue);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    initialTextValue ? initialTextValue.split(",").filter(Boolean) : [],
  );
  const [comment, setComment] = useState(initialComment);
  const [showNcForm, setShowNcForm] = useState(false);
  const [ncDescription, setNcDescription] = useState("");
  const [ncSeverity, setNcSeverity] = useState<NonConformitySeverity>("MEDIA");
  const [ncSaved, setNcSaved] = useState(false);

  async function toggleOption(option: string) {
    const next =
      cfg.listField === "UNICA"
        ? [option]
        : selectedOptions.includes(option)
          ? selectedOptions.filter((o) => o !== option)
          : [...selectedOptions, option];
    setSelectedOptions(next);
    await api.post(`/field-ops/inspections/${inspectionId}/responses`, {
      templateItemId,
      textValue: next.join(","),
      comment: comment || undefined,
    });
  }

  async function saveResponse(nextValue: InspectionResponseValue) {
    setValue(nextValue);
    await api.post(`/field-ops/inspections/${inspectionId}/responses`, {
      templateItemId,
      value: nextValue,
      comment: comment || undefined,
    });
    if (nextValue === "NAO_CONFORME" && cfg.actionPlan) {
      setShowNcForm(true);
      setNcDescription(text);
    }
  }

  async function saveComment() {
    await api.post(`/field-ops/inspections/${inspectionId}/responses`, {
      templateItemId,
      value: value ?? undefined,
      comment: comment || undefined,
    });
  }

  async function handleSaveNonConformity() {
    if (!companyId) return;
    await api.post("/field-ops/non-conformities", {
      companyId,
      inspectionId,
      description: ncDescription,
      severity: ncSeverity,
    });
    setNcSaved(true);
  }

  return (
    <div className="card mt-2">
      {blockLabel && <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-teal-deep">{blockLabel}</p>}
      {category && <p className="mb-1 text-xs font-semibold text-ink-muted">{category}</p>}
      <p className="font-medium text-ink">{text}</p>

      {responseType === "TEXTO_LIVRE" ? (
        cfg.kind === "DATA" ? (
          <input
            type={cfg.dateField === "HORA" ? "time" : "date"}
            className="input mt-3 w-full"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={saveComment}
          />
        ) : cfg.textField === "CURTO" && cfg.kind === "TEXTO" ? (
          <input
            className="input mt-3 w-full"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={saveComment}
          />
        ) : (
          <textarea
            className="input mt-3 w-full"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={saveComment}
          />
        )
      ) : responseType === "SELECAO_MULTIPLA" ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {shownOptions.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink"
            >
              <input
                type={cfg.listField === "UNICA" ? "radio" : "checkbox"}
                name={`opt-${templateItemId}`}
                checked={selectedOptions.includes(option)}
                onChange={() => toggleOption(option)}
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => saveResponse("CONFORME")}
            className={`flex-1 rounded-md border py-3 text-sm font-medium transition-colors ${
              value === "CONFORME" ? "border-teal bg-teal-tint text-teal-deep" : "border-line text-ink-muted"
            }`}
          >
            {responseType === "SIM_NAO" ? "Sim" : "Conforme"}
          </button>
          <button
            onClick={() => saveResponse("NAO_CONFORME")}
            className={`flex-1 rounded-md border py-3 text-sm font-medium transition-colors ${
              value === "NAO_CONFORME" ? "border-danger bg-danger-tint text-danger" : "border-line text-ink-muted"
            }`}
          >
            {responseType === "SIM_NAO" ? "Não" : "Não conforme"}
          </button>
          <button
            onClick={() => saveResponse("NAO_APLICAVEL")}
            className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
              value === "NAO_APLICAVEL" ? "border-ink bg-line text-ink" : "border-line text-ink-muted"
            }`}
          >
            N/A
          </button>
        </div>
      )}

      {responseType !== "TEXTO_LIVRE" && cfg.comment && (
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
          <textarea
            className="input mt-2 w-full"
            rows={2}
            value={ncDescription}
            onChange={(e) => setNcDescription(e.target.value)}
          />
          <select
            className="input mt-2 w-full"
            value={ncSeverity}
            onChange={(e) => setNcSeverity(e.target.value as NonConformitySeverity)}
          >
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
          <EvidenceUploader
            sourceType="INSPECTION_ITEM_RESPONSE"
            sourceId={`${inspectionId}:${templateItemId}`}
            companyId={companyId}
          />
        </div>
      )}
    </div>
  );
}
