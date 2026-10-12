import { useState } from "react";
import { ArrowDown, ArrowUp, MessageSquare, Paperclip, Plus, Trash2, TriangleAlert } from "lucide-react";
import { api } from "../../lib/api";
import type { InspectionItemType, InspectionTemplate } from "../../lib/types";
import {
  RESPONSE_TYPES,
  conditionChoices,
  groupBySection,
  hasOptions,
  isEvaluative,
  responseTypeLabel,
} from "../../lib/checklist-config";

interface DraftSection {
  key: string;
  id?: string;
  name: string;
}

interface DraftItem {
  key: string;
  id?: string;
  sectionKey: string;
  text: string;
  instruction: string;
  responseType: InspectionItemType;
  options: string[];
  required: boolean;
  weight: string;
  allowComment: boolean;
  allowPhoto: boolean;
  allowActionPlan: boolean;
  scaleMin: number;
  scaleMax: number;
  conditionKey: string;
  conditionOperator: "IGUAL" | "DIFERENTE";
  conditionValue: string;
  blockLabel: string | null;
  category: string | null;
}

let keySeed = 0;
const nextKey = (prefix: string) => `${prefix}-${++keySeed}`;

function blankItem(sectionKey: string): DraftItem {
  return {
    key: nextKey("q"),
    sectionKey,
    text: "",
    instruction: "",
    responseType: "CONFORME_NAO_CONFORME",
    options: [],
    required: false,
    weight: "",
    allowComment: true,
    allowPhoto: false,
    allowActionPlan: false,
    scaleMin: 1,
    scaleMax: 5,
    conditionKey: "",
    conditionOperator: "IGUAL",
    conditionValue: "",
    blockLabel: null,
    category: null,
  };
}

function fromTemplate(template: InspectionTemplate): { sections: DraftSection[]; items: DraftItem[] } {
  const keyOfItem = new Map(template.items.map((i) => [i.id, `q-${i.id}`]));
  const sections: DraftSection[] = [...template.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ key: `s-${s.id}`, id: s.id, name: s.name }));
  if (sections.length === 0) sections.push({ key: nextKey("s"), name: "Geral" });
  const items: DraftItem[] = groupBySection(template).flatMap((group) =>
    group.items.map((it): DraftItem => ({
      key: keyOfItem.get(it.id)!,
      id: it.id,
      sectionKey: group.id ? `s-${group.id}` : sections[0]!.key,
      text: it.text,
      instruction: it.instruction ?? "",
      responseType: it.responseType,
      options: it.options,
      required: it.required,
      weight: it.weight === null ? "" : String(it.weight),
      allowComment: it.allowComment,
      allowPhoto: it.allowPhoto,
      allowActionPlan: it.allowActionPlan,
      scaleMin: it.scaleMin ?? 1,
      scaleMax: it.scaleMax ?? 5,
      conditionKey: it.conditionItemId ? (keyOfItem.get(it.conditionItemId) ?? "") : "",
      conditionOperator: it.conditionOperator ?? "IGUAL",
      conditionValue: it.conditionValue ?? "",
      blockLabel: it.blockLabel,
      category: it.category,
    })),
  );
  return { sections, items };
}

/** Aba ESTRUTURA: seções e perguntas do checklist. */
export function ChecklistStructureEditor({
  template,
  onSaved,
}: {
  template: InspectionTemplate;
  onSaved: (updated: InspectionTemplate, versionedFrom?: InspectionTemplate) => void;
}) {
  const initial = fromTemplate(template);
  const [sections, setSections] = useState<DraftSection[]>(initial.sections);
  const [items, setItems] = useState<DraftItem[]>(initial.items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirty = () => setNotice(null);

  function patchItem(key: string, change: Partial<DraftItem>) {
    dirty();
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)));
  }
  function moveSection(index: number, dir: -1 | 1) {
    dirty();
    setSections((prev) => {
      const t = index + dir;
      if (t < 0 || t >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[t]] = [next[t]!, next[index]!];
      return next;
    });
  }
  function moveItem(key: string, dir: -1 | 1) {
    dirty();
    setItems((prev) => {
      const item = prev.find((i) => i.key === key)!;
      const sameSection = prev.filter((i) => i.sectionKey === item.sectionKey);
      const pos = sameSection.findIndex((i) => i.key === key);
      const swapWith = sameSection[pos + dir];
      if (!swapWith) return prev;
      const a = prev.findIndex((i) => i.key === key);
      const b = prev.findIndex((i) => i.key === swapWith.key);
      const next = [...prev];
      [next[a], next[b]] = [next[b]!, next[a]!];
      return next;
    });
  }
  function removeSection(section: DraftSection) {
    const count = items.filter((i) => i.sectionKey === section.key).length;
    const msg = count
      ? `Excluir a seção "${section.name}" e as ${count} pergunta(s) dela?`
      : `Excluir a seção "${section.name}"?`;
    if (!window.confirm(msg)) return;
    dirty();
    setSections((prev) => prev.filter((s) => s.key !== section.key));
    setItems((prev) => prev.filter((i) => i.sectionKey !== section.key));
  }
  function removeItem(item: DraftItem) {
    if (!window.confirm("Excluir esta pergunta?")) return;
    dirty();
    setItems((prev) =>
      prev.filter((i) => i.key !== item.key).map((i) => (i.conditionKey === item.key ? { ...i, conditionKey: "" } : i)),
    );
  }

  /** Ordem final: seções na ordem da tela, e as perguntas de cada uma na ordem em que estão. */
  function orderedItems(): DraftItem[] {
    return sections.flatMap((s) => items.filter((i) => i.sectionKey === s.key));
  }

  async function handleSave() {
    setError(null);
    const flat = orderedItems();
    const blankSection = sections.findIndex((s) => !s.name.trim());
    if (blankSection >= 0) return setError(`Dê um nome à seção ${blankSection + 1}.`);
    const noText = flat.findIndex((i) => i.text.trim().length < 2);
    if (noText >= 0) return setError(`Escreva o enunciado da pergunta ${noText + 1}.`);
    const badChoice = flat.findIndex((i) => hasOptions(i.responseType) && i.options.filter((o) => o.trim()).length < 2);
    if (badChoice >= 0) return setError(`A pergunta ${badChoice + 1} precisa de pelo menos 2 opções.`);
    const badScale = flat.findIndex((i) => i.responseType === "ESCALA" && i.scaleMax <= i.scaleMin);
    if (badScale >= 0) return setError(`Na pergunta ${badScale + 1}, o máximo da escala deve ser maior que o mínimo.`);

    setSaving(true);
    try {
      const updated = await api.put<InspectionTemplate>(`/field-ops/inspection-templates/${template.id}/structure`, {
        sections: sections.map((s) => ({ key: s.key, id: s.id, name: s.name.trim() })),
        items: flat.map((i) => ({
          key: i.key,
          id: i.id,
          sectionKey: i.sectionKey,
          text: i.text.trim(),
          instruction: i.instruction.trim() || undefined,
          responseType: i.responseType,
          options: hasOptions(i.responseType) ? i.options.map((o) => o.trim()).filter(Boolean) : undefined,
          required: i.required,
          weight: i.weight.trim() === "" ? undefined : Math.max(0, Math.round(Number(i.weight) || 0)),
          allowComment: i.allowComment,
          allowPhoto: i.allowPhoto,
          allowActionPlan: isEvaluative(i.responseType) ? i.allowActionPlan : false,
          scaleMin: i.responseType === "ESCALA" ? i.scaleMin : undefined,
          scaleMax: i.responseType === "ESCALA" ? i.scaleMax : undefined,
          conditionKey: i.conditionKey || undefined,
          conditionOperator: i.conditionKey ? i.conditionOperator : undefined,
          conditionValue: i.conditionKey ? i.conditionValue : undefined,
          blockLabel: i.blockLabel ?? undefined,
          category: i.category ?? undefined,
        })),
      });
      const fresh = fromTemplate(updated);
      setSections(fresh.sections);
      setItems(fresh.items);
      setNotice(
        updated.id !== template.id
          ? `Estrutura salva. Como este modelo já foi aplicado, foi criada a versão ${updated.version} — as aplicações anteriores continuam na versão ${template.version}.`
          : "Estrutura salva.",
      );
      onSaved(updated, updated.id !== template.id ? template : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a estrutura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {template.status === "ATIVO" && (template._count?.inspections ?? 0) > 0 && (
        <p className="rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm text-ink">
          Este modelo já foi aplicado. Ao salvar, será criada uma <strong>nova versão</strong> para as próximas aplicações — as aplicações já feitas não mudam.
        </p>
      )}

      {sections.map((section, sIndex) => {
        const sectionItems = items.filter((i) => i.sectionKey === section.key);
        return (
          <section key={section.key} className="rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-4 py-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-teal-deep">Seção {sIndex + 1}</span>
              <input
                className="input min-w-[180px] flex-1"
                value={section.name}
                aria-label={`Nome da seção ${sIndex + 1}`}
                onChange={(e) => {
                  dirty();
                  setSections((prev) => prev.map((s) => (s.key === section.key ? { ...s, name: e.target.value } : s)));
                }}
              />
              <button type="button" onClick={() => moveSection(sIndex, -1)} disabled={sIndex === 0} title="Subir seção" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30">
                <ArrowUp size={15} />
              </button>
              <button type="button" onClick={() => moveSection(sIndex, 1)} disabled={sIndex === sections.length - 1} title="Descer seção" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30">
                <ArrowDown size={15} />
              </button>
              <button type="button" onClick={() => removeSection(section)} disabled={sections.length === 1} title="Excluir seção" className="p-1 text-ink-muted hover:text-danger disabled:opacity-30">
                <Trash2 size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-4">
              {sectionItems.length === 0 && <p className="text-sm text-ink-muted">Nenhuma pergunta nesta seção.</p>}
              {sectionItems.map((item, qIndex) => (
                <QuestionCard
                  key={item.key}
                  number={orderedItems().findIndex((i) => i.key === item.key) + 1}
                  item={item}
                  sections={sections}
                  previous={orderedItems().slice(0, orderedItems().findIndex((i) => i.key === item.key))}
                  canUp={qIndex > 0}
                  canDown={qIndex < sectionItems.length - 1}
                  onChange={(change) => patchItem(item.key, change)}
                  onMove={(dir) => moveItem(item.key, dir)}
                  onRemove={() => removeItem(item)}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  dirty();
                  setItems((prev) => [...prev, blankItem(section.key)]);
                }}
                className="flex w-fit items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-teal-deep hover:bg-teal-tint"
              >
                <Plus size={15} /> Adicionar pergunta
              </button>
            </div>
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => {
          dirty();
          setSections((prev) => [...prev, { key: nextKey("s"), name: `Seção ${prev.length + 1}` }]);
        }}
        className="flex w-fit items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-teal-deep hover:bg-teal-tint"
      >
        <Plus size={15} /> Adicionar seção
      </button>

      {error && <p className="text-sm text-amber" role="alert">{error}</p>}
      {notice && <p className="text-sm text-teal-deep" role="status">{notice}</p>}

      <div className="flex gap-2 border-t border-line pt-4">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar estrutura"}
        </button>
      </div>
    </div>
  );
}

const chip = (on: boolean) =>
  `flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
    on ? "border-teal bg-teal-tint text-teal-deep" : "border-line bg-paper-raised text-ink-muted hover:text-ink"
  }`;

function QuestionCard({
  number,
  item,
  sections,
  previous,
  canUp,
  canDown,
  onChange,
  onMove,
  onRemove,
}: {
  number: number;
  item: DraftItem;
  sections: DraftSection[];
  previous: DraftItem[];
  canUp: boolean;
  canDown: boolean;
  onChange: (change: Partial<DraftItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const condParent = previous.find((p) => p.key === item.conditionKey);
  const choices = condParent ? conditionChoices({ responseType: condParent.responseType, options: condParent.options.filter((o) => o.trim()) }) : null;
  const isLegacy = !RESPONSE_TYPES.some((t) => t.value === item.responseType);

  return (
    <div className="rounded-lg border border-line bg-paper-raised">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-teal-deep">Pergunta {number}</p>
        <div className="flex items-center gap-1 text-ink-muted">
          <button type="button" onClick={() => onMove(-1)} disabled={!canUp} title="Subir pergunta" className="p-1 hover:text-ink disabled:opacity-30"><ArrowUp size={15} /></button>
          <button type="button" onClick={() => onMove(1)} disabled={!canDown} title="Descer pergunta" className="p-1 hover:text-ink disabled:opacity-30"><ArrowDown size={15} /></button>
          <button type="button" onClick={onRemove} title="Excluir pergunta" className="p-1 hover:text-danger"><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Enunciado da pergunta *</span>
          <input className="input" value={item.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Digite a pergunta ou o que será verificado" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Instrução ou orientação</span>
          <textarea className="input min-h-[60px] resize-y" value={item.instruction} onChange={(e) => onChange({ instruction: e.target.value })} placeholder="Opcional — ajuda quem vai responder" />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm">
            <span className="text-ink-muted">Tipo de resposta</span>
            <select
              className="input"
              value={item.responseType}
              onChange={(e) => onChange({ responseType: e.target.value as InspectionItemType, allowActionPlan: false })}
            >
              {isLegacy && <option value={item.responseType}>{responseTypeLabel(item.responseType)}</option>}
              {RESPONSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex w-36 flex-col gap-1 text-sm">
            <span className="text-ink-muted">Peso / pontuação</span>
            <input type="number" min={0} step={1} className="input" value={item.weight} onChange={(e) => onChange({ weight: e.target.value })} placeholder="Opcional" />
          </label>
          <label className="flex w-48 flex-col gap-1 text-sm">
            <span className="text-ink-muted">Seção</span>
            <select className="input" value={item.sectionKey} onChange={(e) => onChange({ sectionKey: e.target.value })}>
              {sections.map((s) => (
                <option key={s.key} value={s.key}>{s.name || "Sem nome"}</option>
              ))}
            </select>
          </label>
        </div>

        {hasOptions(item.responseType) && (
          <OptionsEditor
            options={item.options}
            multiple={item.responseType === "SELECAO_MULTIPLA"}
            onChange={(options) => onChange({ options })}
          />
        )}

        {item.responseType === "ESCALA" && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-28 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Mínimo</span>
              <input type="number" className="input" value={item.scaleMin} onChange={(e) => onChange({ scaleMin: Number(e.target.value) })} />
            </label>
            <label className="flex w-28 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Máximo</span>
              <input type="number" className="input" value={item.scaleMax} onChange={(e) => onChange({ scaleMax: Number(e.target.value) })} />
            </label>
            <p className="pb-2 text-xs text-ink-muted">De {item.scaleMin} a {item.scaleMax}.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">Opções da resposta</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(item.required)} aria-pressed={item.required} onClick={() => onChange({ required: !item.required })}>
              Resposta obrigatória
            </button>
            <button type="button" className={chip(item.allowComment)} aria-pressed={item.allowComment} onClick={() => onChange({ allowComment: !item.allowComment })}>
              <MessageSquare size={14} /> Comentário
            </button>
            <button type="button" className={chip(item.allowPhoto)} aria-pressed={item.allowPhoto} onClick={() => onChange({ allowPhoto: !item.allowPhoto })}>
              <Paperclip size={14} /> Foto ou arquivo
            </button>
            {isEvaluative(item.responseType) && (
              <button type="button" className={chip(item.allowActionPlan)} aria-pressed={item.allowActionPlan} onClick={() => onChange({ allowActionPlan: !item.allowActionPlan })}>
                <TriangleAlert size={14} /> Não conformidade / Plano de ação
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-md bg-paper p-3">
          <p className="text-sm font-semibold text-ink">Regra condicional</p>
          {previous.length === 0 ? (
            <p className="text-xs text-ink-muted">Disponível a partir da segunda pergunta.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2 text-sm">
              <label className="flex min-w-[220px] flex-1 flex-col gap-1">
                <span className="text-ink-muted">Mostrar esta pergunta somente se a pergunta…</span>
                <select
                  className="input"
                  value={item.conditionKey}
                  onChange={(e) => onChange({ conditionKey: e.target.value, conditionValue: "", conditionOperator: "IGUAL" })}
                >
                  <option value="">Sempre mostrar</option>
                  {previous.map((p, i) => (
                    <option key={p.key} value={p.key}>
                      {i + 1}. {p.text.trim() || "(sem enunciado)"}
                    </option>
                  ))}
                </select>
              </label>
              {item.conditionKey && (
                <>
                  <label className="flex w-40 flex-col gap-1">
                    <span className="text-ink-muted">for</span>
                    <select className="input" value={item.conditionOperator} onChange={(e) => onChange({ conditionOperator: e.target.value as "IGUAL" | "DIFERENTE" })}>
                      <option value="IGUAL">igual a</option>
                      <option value="DIFERENTE">diferente de</option>
                    </select>
                  </label>
                  <label className="flex min-w-[160px] flex-1 flex-col gap-1">
                    <span className="text-ink-muted">Resposta</span>
                    {choices ? (
                      <select className="input" value={item.conditionValue} onChange={(e) => onChange({ conditionValue: e.target.value })}>
                        <option value="">Escolha…</option>
                        {choices.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input" value={item.conditionValue} onChange={(e) => onChange({ conditionValue: e.target.value })} />
                    )}
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionsEditor({ options, multiple, onChange }: { options: string[]; multiple: boolean; onChange: (options: string[]) => void }) {
  function move(i: number, dir: -1 | 1) {
    const t = i + dir;
    if (t < 0 || t >= options.length) return;
    const next = [...options];
    [next[i], next[t]] = [next[t]!, next[i]!];
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-muted">Opções ({multiple ? "pode marcar várias" : "marca uma só"}) — mínimo de 2</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input flex-1"
            value={opt}
            placeholder={`Opção ${i + 1}`}
            aria-label={`Opção ${i + 1}`}
            onChange={(e) => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
          />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Subir opção" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"><ArrowUp size={15} /></button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === options.length - 1} title="Descer opção" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"><ArrowDown size={15} /></button>
          <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} title="Excluir opção" className="p-1 text-ink-muted hover:text-danger"><Trash2 size={15} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, ""])} className="flex w-fit items-center gap-1.5 text-sm font-medium text-teal-deep hover:underline">
        <Plus size={14} /> Adicionar opção
      </button>
    </div>
  );
}
