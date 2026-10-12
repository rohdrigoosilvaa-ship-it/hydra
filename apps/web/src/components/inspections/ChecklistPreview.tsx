import { useState } from "react";
import { X } from "lucide-react";
import type { InspectionTemplate, InspectionTemplateItem } from "../../lib/types";
import { AnswerInput } from "./AnswerInput";
import { groupBySection, responseTypeLabel } from "../../lib/checklist-config";

/** Prévia do checklist como quem aplica vai ver — as respostas ficam só na tela, nada é salvo. */
export function ChecklistPreview({ template, onClose }: { template: InspectionTemplate; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const groups = groupBySection(template);
  const all = template.items;

  function visible(item: InspectionTemplateItem): boolean {
    if (!item.conditionItemId) return true;
    const parent = all.find((i) => i.id === item.conditionItemId);
    if (!parent || !visible(parent)) return false;
    const answer = (answers[parent.id] ?? "").split(",").filter(Boolean);
    const matches = answer.includes(item.conditionValue ?? "");
    return item.conditionOperator === "DIFERENTE" ? !matches : matches;
  }

  const shown = all.filter(visible);
  const answered = shown.filter((i) => (answers[i.id] ?? "") !== "").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Prévia do checklist">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-line bg-paper-raised shadow-lg">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-teal-deep">Prévia — nada é salvo</p>
            <h2 className="font-display text-lg font-semibold text-ink">{template.name}</h2>
            {template.description && <p className="mt-0.5 text-sm text-ink-muted">{template.description}</p>}
            <p className="text-xs text-ink-muted">
              {answered} de {shown.length} perguntas respondidas
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar prévia" className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {template.items.length === 0 && <p className="text-sm text-ink-muted">Este modelo ainda não tem perguntas.</p>}
          {groups
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <section key={group.id ?? "geral"} className="mb-6">
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wide text-teal-deep">{group.name}
                  {template.sections.find((s) => s.id === group.id)?.repeatable && (
                    <span className="ml-2 rounded-full bg-teal-tint px-2 py-0.5 text-[10px] normal-case tracking-normal text-teal-deep">repetível</span>
                  )}
                </h3>
                <div className="flex flex-col gap-3">
                  {group.items.filter(visible).map((item) => (
                    <PreviewQuestion key={item.id} item={item} value={answers[item.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [item.id]: v }))} />
                  ))}
                </div>
              </section>
            ))}
        </div>

        <div className="border-t border-line px-5 py-3">
          <button type="button" onClick={onClose} className="btn-secondary">Fechar prévia</button>
        </div>
      </div>
    </div>
  );
}

function PreviewQuestion({ item, value, onChange }: { item: InspectionTemplateItem; value: string; onChange: (v: string) => void }) {
  const pill = (on: boolean) =>
    `rounded-md border px-3 py-2 text-sm font-medium transition-colors ${on ? "border-teal bg-teal-tint text-teal-deep" : "border-line text-ink-muted hover:text-ink"}`;

  return (
    <div className="rounded-md border border-line p-3">
      <p className="text-sm font-medium text-ink">
        {item.text} {item.required && <span className="text-danger" title="Resposta obrigatória">*</span>}
        {item.weight ? <span className="ml-2 font-mono text-[10px] text-ink-muted">peso {item.weight}</span> : null}
      </p>
      {item.instruction && <p className="mt-0.5 text-xs text-ink-muted">{item.instruction}</p>}

      <div className="mt-2">
        {item.responseType === "CONFORME_NAO_CONFORME" && (
          <div className="flex flex-wrap gap-2">
            {[["CONFORME", "Conforme"], ["NAO_CONFORME", "Não conforme"], ["NAO_APLICAVEL", "Não aplicável"]].map(([v, l]) => (
              <button key={v} type="button" className={pill(value === v)} onClick={() => onChange(v!)}>{l}</button>
            ))}
          </div>
        )}
        {item.responseType === "SIM_NAO" && (
          <div className="flex gap-2">
            {[["SIM", "Sim"], ["NAO", "Não"]].map(([v, l]) => (
              <button key={v} type="button" className={pill(value === v)} onClick={() => onChange(v!)}>{l}</button>
            ))}
          </div>
        )}
        {item.responseType !== "CONFORME_NAO_CONFORME" && item.responseType !== "SIM_NAO" && (
          <AnswerInput item={item} name={`prev-${item.id}`} value={value} onChange={onChange} onCommit={onChange} preview />
        )}
      </div>

      <p className="mt-2 text-[11px] text-ink-muted">
        {responseTypeLabel(item.responseType)}
        {item.allowComment ? " · comentário" : ""}
        {item.allowPhoto ? " · anexos" : ""}
        {item.allowActionPlan ? " · plano de ação" : ""}
      </p>
    </div>
  );
}
