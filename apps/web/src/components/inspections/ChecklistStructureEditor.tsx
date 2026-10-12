import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical, MessageSquare, Paperclip, Plus, Star, Trash2, TriangleAlert, X } from "lucide-react";
import { api } from "../../lib/api";
import type { InspectionItemType, InspectionTemplate } from "../../lib/types";
import {
  EXTRA_RESPONSE_TYPES,
  RESPONSE_TYPES,
  conditionChoices,
  groupBySection,
  hasOptions,
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
  rows: string[];
  scaleMinLabel: string;
  scaleMaxLabel: string;
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
    responseType: "SELECAO_UNICA",
    options: ["Opção 1", "Opção 2"],
    rows: [],
    scaleMinLabel: "",
    scaleMaxLabel: "",
    required: false,
    weight: "",
    allowComment: false,
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
      rows: it.rows ?? [],
      scaleMinLabel: it.scaleMinLabel ?? "",
      scaleMaxLabel: it.scaleMaxLabel ?? "",
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

const usesOptions = (type: InspectionItemType) => hasOptions(type) || type === "GRADE";

/** Textos de apoio por tipo, quando a configuração é só uma amostra do campo. */
function switchType(item: DraftItem, responseType: InspectionItemType): Partial<DraftItem> {
  const change: Partial<DraftItem> = { responseType };
  if (usesOptions(responseType) && item.options.filter((o) => o.trim()).length < 2) {
    change.options = responseType === "GRADE" ? ["Coluna 1", "Coluna 2"] : ["Opção 1", "Opção 2"];
  }
  if (responseType === "GRADE" && item.rows.length === 0) change.rows = ["Linha 1"];
  if (responseType === "ESCALA" && item.scaleMax <= item.scaleMin) change.scaleMax = 5;
  if (responseType === "UPLOAD") change.allowPhoto = true;
  return change;
}

/** Aba ESTRUTURA: título, descrição e itens do checklist, no estilo de um formulário. */
export function ChecklistStructureEditor({
  template,
  onSaved,
}: {
  template: InspectionTemplate;
  onSaved: (updated: InspectionTemplate, versionedFrom?: InspectionTemplate) => void;
}) {
  const initial = fromTemplate(template);
  // Os itens ficam numa lista única; as seções (modelos antigos) continuam existindo por baixo, sem aparecer na tela.
  const [sections, setSections] = useState<DraftSection[]>(initial.sections);
  const [items, setItems] = useState<DraftItem[]>(initial.items);
  const [title, setTitle] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [activeKey, setActiveKey] = useState<string | null>(initial.items[0]?.key ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirty = () => setNotice(null);

  /** Ordem final: seções na ordem da tela, e os itens de cada uma na ordem em que estão. */
  const ordered = (): DraftItem[] => sections.flatMap((s) => items.filter((i) => i.sectionKey === s.key));
  const list = ordered();
  const labels: Record<string, string> = {};
  sections.forEach((sec, si) =>
    items.filter((i) => i.sectionKey === sec.key).forEach((i, ii) => (labels[i.key] = `Seção ${si + 1} · Item ${ii + 1}`)),
  );

  function patchItem(key: string, change: Partial<DraftItem>) {
    dirty();
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)));
  }
  function addItem(sectionKey: string) {
    dirty();
    const item = blankItem(sectionKey);
    setItems((prev) => [...prev, item]);
    setActiveKey(item.key);
  }
  function duplicateItem(item: DraftItem) {
    dirty();
    const copy: DraftItem = { ...item, key: nextKey("q"), id: undefined, text: item.text, conditionKey: item.conditionKey };
    setItems((prev) => {
      const at = prev.findIndex((i) => i.key === item.key);
      const next = [...prev];
      next.splice(at + 1, 0, copy);
      return next;
    });
    setActiveKey(copy.key);
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
  function addSection() {
    dirty();
    const section: DraftSection = { key: nextKey("s"), name: "" };
    const item = blankItem(section.key);
    setSections((prev) => [...prev, section]);
    setItems((prev) => [...prev, item]);
    setActiveKey(item.key);
  }
  function renameSection(key: string, name: string) {
    dirty();
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, name } : s)));
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
  function removeSection(section: DraftSection) {
    const count = items.filter((i) => i.sectionKey === section.key).length;
    if (!window.confirm(count ? `Excluir esta seção e os ${count} item(ns) dela?` : "Excluir esta seção?")) return;
    dirty();
    const gone = new Set(items.filter((i) => i.sectionKey === section.key).map((i) => i.key));
    setSections((prev) => prev.filter((s) => s.key !== section.key));
    setItems((prev) => prev.filter((i) => !gone.has(i.key)).map((i) => (gone.has(i.conditionKey) ? { ...i, conditionKey: "" } : i)));
    setActiveKey(null);
  }
  function removeItem(item: DraftItem) {
    if (!window.confirm("Excluir este item?")) return;
    dirty();
    setItems((prev) =>
      prev.filter((i) => i.key !== item.key).map((i) => (i.conditionKey === item.key ? { ...i, conditionKey: "" } : i)),
    );
    setActiveKey(null);
  }

  async function handleSave() {
    setError(null);
    const flat = ordered();
    if (title.trim().length < 2) return setError("Escreva o nome do checklist em “Formulário sem título”.");
    const noName = sections.findIndex((sec) => !sec.name.trim());
    if (noName >= 0) return setError(`Dê um título à seção ${noName + 1}.`);
    const noText = flat.findIndex((i) => i.text.trim().length < 2);
    if (noText >= 0) {
      setActiveKey(flat[noText]!.key);
      return setError(`Escreva o texto do item (${labels[flat[noText]!.key]}).`);
    }
    const badChoice = flat.findIndex((i) => usesOptions(i.responseType) && i.options.filter((o) => o.trim()).length < 2);
    if (badChoice >= 0) {
      setActiveKey(flat[badChoice]!.key);
      return setError(`O item (${labels[flat[badChoice]!.key]}) precisa de pelo menos 2 ${flat[badChoice]!.responseType === "GRADE" ? "colunas" : "opções"}.`);
    }
    const badRows = flat.findIndex((i) => i.responseType === "GRADE" && i.rows.filter((o) => o.trim()).length < 1);
    if (badRows >= 0) {
      setActiveKey(flat[badRows]!.key);
      return setError(`O item (${labels[flat[badRows]!.key]}) precisa de pelo menos 1 linha.`);
    }
    const badScale = flat.findIndex((i) => i.responseType === "ESCALA" && i.scaleMax <= i.scaleMin);
    if (badScale >= 0) {
      setActiveKey(flat[badScale]!.key);
      return setError(`No item (${labels[flat[badScale]!.key]}), o máximo da escala deve ser maior que o mínimo.`);
    }

    setSaving(true);
    try {
      const updated = await api.put<InspectionTemplate>(`/field-ops/inspection-templates/${template.id}/structure`, {
        name: title.trim(),
        description: description.trim(),
        sections: sections.map((s) => ({ key: s.key, id: s.id, name: s.name.trim() })),
        items: flat.map((i) => ({
          key: i.key,
          id: i.id,
          sectionKey: i.sectionKey,
          text: i.text.trim(),
          instruction: i.instruction.trim() || undefined,
          responseType: i.responseType,
          options: usesOptions(i.responseType) ? i.options.map((o) => o.trim()).filter(Boolean) : undefined,
          rows: i.responseType === "GRADE" ? i.rows.map((o) => o.trim()).filter(Boolean) : undefined,
          required: i.required,
          weight: i.weight.trim() === "" ? undefined : Math.max(0, Math.round(Number(i.weight) || 0)),
          allowComment: i.allowComment,
          allowPhoto: i.responseType === "UPLOAD" ? true : i.allowPhoto,
          allowActionPlan: i.allowActionPlan,
          scaleMin: i.responseType === "ESCALA" ? i.scaleMin : undefined,
          scaleMax: i.responseType === "ESCALA" || i.responseType === "CLASSIFICACAO" ? i.scaleMax : undefined,
          scaleMinLabel: i.responseType === "ESCALA" ? i.scaleMinLabel.trim() || undefined : undefined,
          scaleMaxLabel: i.responseType === "ESCALA" ? i.scaleMaxLabel.trim() || undefined : undefined,
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
      setActiveKey(null);
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {template.status === "ATIVO" && (template._count?.inspections ?? 0) > 0 && (
        <p className="rounded-md border-l-2 border-amber bg-amber-tint px-3 py-2 text-sm text-ink">
          Este modelo já foi aplicado. Ao salvar, será criada uma <strong>nova versão</strong> para as próximas aplicações — as aplicações já feitas não mudam.
        </p>
      )}

      <div className="panel flex flex-col gap-2 p-5">
        <input
          className="w-full border-0 border-b border-line bg-transparent pb-2 font-display text-2xl font-semibold text-ink outline-none placeholder:text-ink-muted focus:border-teal"
          placeholder="Formulário sem título"
          aria-label="Nome do checklist"
          maxLength={255}
          value={title}
          onChange={(e) => {
            dirty();
            setTitle(e.target.value);
          }}
        />
        <textarea
          className="min-h-[56px] w-full resize-y border-0 border-b border-line bg-transparent pb-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-teal"
          placeholder="Descrição do formulário"
          aria-label="Descrição do checklist"
          maxLength={5000}
          value={description}
          onChange={(e) => {
            dirty();
            setDescription(e.target.value);
          }}
        />
      </div>

      {sections.map((section, sIndex) => {
        const sectionItems = items.filter((i) => i.sectionKey === section.key);
        return (
          <section key={section.key} className="flex flex-col gap-3" aria-label={`Seção ${sIndex + 1}`}>
            <div className="flex flex-wrap items-center gap-2 rounded-md border-l-4 border-teal bg-paper-raised px-4 py-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-teal-deep">Seção {sIndex + 1}</span>
              <input
                className="input min-w-[200px] flex-1"
                placeholder="Título da seção (ex.: Identificação da visita)"
                aria-label={`Título da seção ${sIndex + 1}`}
                value={section.name}
                onChange={(e) => renameSection(section.key, e.target.value)}
              />
              <button type="button" onClick={() => moveSection(sIndex, -1)} disabled={sIndex === 0} title="Subir seção" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" onClick={() => moveSection(sIndex, 1)} disabled={sIndex === sections.length - 1} title="Descer seção" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" onClick={() => removeSection(section)} disabled={sections.length === 1} title="Excluir seção" className="p-1 text-ink-muted hover:text-danger disabled:opacity-30"><Trash2 size={16} /></button>
            </div>

            {sectionItems.map((item, index) => (
              <ItemCard
                key={item.key}
                number={index + 1}
                item={item}
                active={activeKey === item.key}
                previous={list.slice(0, list.findIndex((i) => i.key === item.key))}
                labels={labels}
                canUp={index > 0}
                canDown={index < sectionItems.length - 1}
                onActivate={() => setActiveKey(item.key)}
                onChange={(change) => patchItem(item.key, change)}
                onMove={(dir) => moveItem(item.key, dir)}
                onDuplicate={() => duplicateItem(item)}
                onRemove={() => removeItem(item)}
              />
            ))}

            <button
              type="button"
              onClick={() => addItem(section.key)}
              className="flex w-fit items-center gap-1.5 rounded-md border border-line bg-paper-raised px-4 py-2.5 text-sm font-medium text-teal-deep hover:bg-teal-tint"
            >
              <Plus size={16} /> Adicionar item
            </button>
          </section>
        );
      })}

      <button
        type="button"
        onClick={addSection}
        className="flex w-fit items-center gap-1.5 rounded-md border border-line bg-paper-raised px-4 py-2.5 text-sm font-medium text-teal-deep hover:bg-teal-tint"
      >
        <Plus size={16} /> Adicionar seção
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

function ItemCard({
  number,
  item,
  active,
  previous,
  labels,
  canUp,
  canDown,
  onActivate,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  number: number;
  item: DraftItem;
  active: boolean;
  previous: DraftItem[];
  labels: Record<string, string>;
  canUp: boolean;
  canDown: boolean;
  onActivate: () => void;
  onChange: (change: Partial<DraftItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [more, setMore] = useState(Boolean(item.weight || item.conditionKey));

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="card w-full text-left transition-colors hover:border-teal"
        aria-label={`Editar item ${number}`}
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-teal-deep">Item {number}</p>
        <p className="mt-1 text-sm font-medium text-ink">
          {item.text.trim() || <span className="text-ink-muted">(sem texto)</span>}
          {item.required && <span className="ml-1 text-danger">*</span>}
        </p>
        {item.instruction.trim() && <p className="text-xs text-ink-muted">{item.instruction}</p>}
        <p className="mt-1 text-[11px] text-ink-muted">
          {responseTypeLabel(item.responseType)}
          {item.allowComment ? " · comentário" : ""}
          {item.allowActionPlan ? " · plano de ação" : ""}
          {item.allowPhoto && item.responseType !== "UPLOAD" ? " · anexo" : ""}
        </p>
      </button>
    );
  }

  const condParent = previous.find((p) => p.key === item.conditionKey);
  const choices = condParent ? conditionChoices({ responseType: condParent.responseType, options: condParent.options.filter((o) => o.trim()) }) : null;
  const isExtra = EXTRA_RESPONSE_TYPES.some((t) => t.value === item.responseType);
  const isLegacy = !RESPONSE_TYPES.some((t) => t.value === item.responseType) && !isExtra;

  return (
    <div className="panel flex flex-col gap-4 p-5" aria-label={`Item ${number}`}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-teal-deep">Item {number}</p>
        <GripVertical size={16} className="text-ink-muted" aria-hidden />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input flex-[2]"
          placeholder="Item"
          aria-label="Item"
          value={item.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        <select
          className="input flex-1"
          aria-label="Tipo"
          value={item.responseType}
          onChange={(e) => onChange(switchType(item, e.target.value as InspectionItemType))}
        >
          {isLegacy && <option value={item.responseType}>{responseTypeLabel(item.responseType)}</option>}
          {RESPONSE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
          <optgroup label="Avaliação e outros">
            {EXTRA_RESPONSE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </optgroup>
        </select>
      </div>
      <TypeConfig item={item} onChange={onChange} />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink">Selecione os complementos desejados.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(item.allowComment)} aria-pressed={item.allowComment} onClick={() => onChange({ allowComment: !item.allowComment })}>
            <MessageSquare size={14} /> Comentário
          </button>
          <button type="button" className={chip(item.allowActionPlan)} aria-pressed={item.allowActionPlan} onClick={() => onChange({ allowActionPlan: !item.allowActionPlan })}>
            <TriangleAlert size={14} /> Plano de ação
          </button>
          {item.responseType !== "UPLOAD" && (
            <button type="button" className={chip(item.allowPhoto)} aria-pressed={item.allowPhoto} onClick={() => onChange({ allowPhoto: !item.allowPhoto })}>
              <Paperclip size={14} /> Anexo
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={item.required} onChange={(e) => onChange({ required: e.target.checked })} /> Obrigatório
          </label>
          <button type="button" onClick={() => setMore((m) => !m)} className="text-sm font-medium text-teal-deep hover:underline" aria-expanded={more}>
            Mais opções
          </button>
        </div>
        <div className="flex items-center gap-1 text-ink-muted">
          <button type="button" onClick={() => onMove(-1)} disabled={!canUp} title="Subir item" className="p-1.5 hover:text-ink disabled:opacity-30"><ArrowUp size={16} /></button>
          <button type="button" onClick={() => onMove(1)} disabled={!canDown} title="Descer item" className="p-1.5 hover:text-ink disabled:opacity-30"><ArrowDown size={16} /></button>
          <button type="button" onClick={onDuplicate} title="Duplicar item" className="p-1.5 hover:text-ink"><Copy size={16} /></button>
          <button type="button" onClick={onRemove} title="Excluir item" className="p-1.5 hover:text-danger"><Trash2 size={16} /></button>
        </div>
      </div>

      {more && (
        <div className="flex flex-col gap-3 rounded-md bg-paper p-3">
          <label className="flex w-40 flex-col gap-1 text-sm">
            <span className="text-ink-muted">Peso / pontuação</span>
            <input type="number" min={0} step={1} className="input" value={item.weight} onChange={(e) => onChange({ weight: e.target.value })} placeholder="Opcional" />
          </label>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Regra condicional</p>
            {previous.length === 0 ? (
              <p className="text-xs text-ink-muted">Disponível a partir do segundo item.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2 text-sm">
                <label className="flex min-w-[220px] flex-1 flex-col gap-1">
                  <span className="text-ink-muted">Mostrar este item somente se o item…</span>
                  <select
                    className="input"
                    value={item.conditionKey}
                    onChange={(e) => onChange({ conditionKey: e.target.value, conditionValue: "", conditionOperator: "IGUAL" })}
                  >
                    <option value="">Sempre mostrar</option>
                    {previous.map((p) => (
                      <option key={p.key} value={p.key}>
                        {labels[p.key]}: {p.text.trim() || "(sem texto)"}
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
      )}
    </div>
  );
}

/** Configuração própria de cada tipo, no formato em que quem responde vai ver. */
function TypeConfig({ item, onChange }: { item: DraftItem; onChange: (change: Partial<DraftItem>) => void }) {
  const ghost = "input pointer-events-none opacity-60";
  switch (item.responseType) {
    case "TEXTO_CURTO":
      return <input className={`${ghost} w-full sm:w-1/2`} disabled placeholder="Texto de resposta curta" aria-hidden />;
    case "TEXTO_LONGO":
    case "TEXTO_LIVRE":
      return <textarea className={`${ghost} w-full`} rows={3} disabled placeholder="Texto de resposta longa" aria-hidden />;
    case "NUMERO":
    case "NOTA":
      return <input className={`${ghost} w-40`} disabled placeholder="Número" aria-hidden />;
    case "DATA":
      return <input type="date" className={`${ghost} w-48`} disabled aria-hidden />;
    case "HORA":
      return <input type="time" className={`${ghost} w-40`} disabled aria-hidden />;
    case "UPLOAD":
      return (
        <p className="rounded-md border border-dashed border-line px-3 py-4 text-sm text-ink-muted">
          Quem responder poderá enviar um arquivo (foto, PDF, documento).
        </p>
      );
    case "SELECAO_UNICA":
      return <ListEditor label="Opção" values={item.options} marker="radio" onChange={(options) => onChange({ options })} />;
    case "SELECAO_MULTIPLA":
      return <ListEditor label="Opção" values={item.options} marker="checkbox" onChange={(options) => onChange({ options })} />;
    case "LISTA_SUSPENSA":
      return <ListEditor label="Opção" values={item.options} marker="number" onChange={(options) => onChange({ options })} />;
    case "ESCALA":
      return (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-ink">
            <select className="input w-20" aria-label="Início da escala" value={item.scaleMin} onChange={(e) => onChange({ scaleMin: Number(e.target.value) })}>
              {[0, 1].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>até</span>
            <select className="input w-20" aria-label="Fim da escala" value={item.scaleMax} onChange={(e) => onChange({ scaleMax: Number(e.target.value) })}>
              {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-ink-muted">{item.scaleMin}</span>
            <input className="input flex-1" placeholder="Rótulo (opcional)" aria-label="Rótulo do início" value={item.scaleMinLabel} onChange={(e) => onChange({ scaleMinLabel: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-ink-muted">{item.scaleMax}</span>
            <input className="input flex-1" placeholder="Rótulo (opcional)" aria-label="Rótulo do fim" value={item.scaleMaxLabel} onChange={(e) => onChange({ scaleMaxLabel: e.target.value })} />
          </div>
        </div>
      );
    case "CLASSIFICACAO":
      return (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select className="input w-24" aria-label="Quantidade de estrelas" value={item.scaleMax} onChange={(e) => onChange({ scaleMax: Number(e.target.value) })}>
            {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <div className="flex gap-1 text-line-strong" aria-hidden>
            {Array.from({ length: item.scaleMax }, (_, i) => (
              <Star key={i} size={22} />
            ))}
          </div>
        </div>
      );
    case "GRADE":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <ListEditor label="Linha" title="Linhas" values={item.rows} marker="number" min={1} onChange={(rows) => onChange({ rows })} />
          <ListEditor label="Coluna" title="Colunas" values={item.options} marker="radio" onChange={(options) => onChange({ options })} />
        </div>
      );
    case "CONFORME_NAO_CONFORME":
      return <p className="text-sm text-ink-muted">Respostas: Conforme, Não conforme ou Não aplicável.</p>;
    case "SIM_NAO":
      return <p className="text-sm text-ink-muted">Respostas: Sim ou Não.</p>;
    default:
      return null;
  }
}

function ListEditor({
  label,
  title,
  values,
  marker,
  min = 2,
  onChange,
}: {
  label: string;
  title?: string;
  values: string[];
  marker: "radio" | "checkbox" | "number";
  min?: number;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {title && <p className="text-sm font-medium text-ink">{title}</p>}
      {values.map((value, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex w-5 justify-center text-xs text-ink-muted" aria-hidden>
            {marker === "number" ? `${i + 1}.` : <input type={marker} disabled className="pointer-events-none" tabIndex={-1} />}
          </span>
          <input
            className="input flex-1"
            value={value}
            placeholder={`${label} ${i + 1}`}
            aria-label={`${label} ${i + 1}`}
            onChange={(e) => onChange(values.map((o, j) => (j === i ? e.target.value : o)))}
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            disabled={values.length <= min}
            title={`Remover ${label.toLowerCase()}`}
            className="p-1 text-ink-muted hover:text-danger disabled:opacity-30"
          >
            <X size={15} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ""])} className="flex w-fit items-center gap-1.5 text-sm font-medium text-teal-deep hover:underline">
        <Plus size={14} /> Adicionar {label.toLowerCase()}
      </button>
    </div>
  );
}
