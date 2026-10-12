import { useState } from "react";
import { ArrowDown, ArrowUp, Clock, CalendarDays, MessageSquare, Paperclip, Plus, Trash2, TriangleAlert } from "lucide-react";
import { api } from "../../lib/api";
import type { InspectionTemplate } from "../../lib/types";
import {
  KIND_LABEL,
  blankConfig,
  decodeItem,
  encodeItem,
  type ItemConfig,
  type ItemKind,
} from "../../lib/checklist-item-config";

interface DraftItem {
  /** id do item já salvo (ausente = item novo). */
  id?: string;
  /** chave local estável para o React. */
  key: string;
  text: string;
  blockLabel?: string | null;
  category?: string | null;
  cfg: ItemConfig;
}

let keySeed = 0;
const nextKey = () => `item-${++keySeed}`;

function fromTemplate(template: InspectionTemplate): DraftItem[] {
  return template.items.map((it) => ({
    id: it.id,
    key: nextKey(),
    text: it.text,
    blockLabel: it.blockLabel,
    category: it.category,
    cfg: decodeItem(it),
  }));
}

/** Aba ESTRUTURA: monta o checklist item a item, cada um com seu tipo e complementos. */
export function ChecklistStructureEditor({
  template,
  onSaved,
}: {
  template: InspectionTemplate;
  onSaved: (updated: InspectionTemplate) => void;
}) {
  const [items, setItems] = useState<DraftItem[]>(() => fromTemplate(template));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(key: string, change: Partial<DraftItem>) {
    setSaved(false);
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)));
  }
  function patchCfg(key: string, change: Partial<ItemConfig>) {
    setSaved(false);
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, cfg: { ...it.cfg, ...change } } : it)));
  }
  function move(index: number, dir: -1 | 1) {
    setSaved(false);
    setItems((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    const empty = items.findIndex((it) => it.text.trim().length < 2);
    if (empty >= 0) {
      setError(`Escreva o texto do item ${empty + 1}.`);
      return;
    }
    const noOptions = items.findIndex((it) => it.cfg.kind === "LISTA" && it.cfg.options.filter((o) => o.trim()).length < 2);
    if (noOptions >= 0) {
      setError(`O item ${noOptions + 1} é uma lista de seleção: informe pelo menos 2 opções.`);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put<InspectionTemplate>(`/field-ops/inspection-templates/${template.id}/structure`, {
        items: items.map((it) => ({
          id: it.id,
          text: it.text.trim(),
          blockLabel: it.blockLabel ?? undefined,
          category: it.category ?? undefined,
          ...encodeItem(it.cfg),
        })),
      });
      setItems(fromTemplate(updated));
      setSaved(true);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a estrutura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          Nenhum item ainda. Clique em “Adicionar item” para começar a estruturar o checklist.
        </p>
      )}

      {items.map((item, index) => (
        <ItemCard
          key={item.key}
          index={index}
          total={items.length}
          item={item}
          onText={(text) => patch(item.key, { text })}
          onCfg={(change) => patchCfg(item.key, change)}
          onKind={(kind) => patchCfg(item.key, { ...blankConfig(kind), comment: item.cfg.comment, actionPlan: item.cfg.actionPlan, attachments: item.cfg.attachments, options: item.cfg.options, weight: item.cfg.weight })}
          onMove={(dir) => move(index, dir)}
          onRemove={() => {
            setSaved(false);
            setItems((prev) => prev.filter((it) => it.key !== item.key));
          }}
        />
      ))}

      <button
        type="button"
        onClick={() => {
          setSaved(false);
          setItems((prev) => [...prev, { key: nextKey(), text: "", cfg: blankConfig() }]);
        }}
        className="flex w-fit items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-teal-deep hover:bg-teal-tint"
      >
        <Plus size={15} /> Adicionar item
      </button>

      {error && <p className="text-sm text-amber">{error}</p>}
      {saved && <p className="text-sm text-teal-deep">Estrutura salva.</p>}

      <div className="flex gap-2 border-t border-line pt-4">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar estrutura"}
        </button>
      </div>
    </div>
  );
}

const CHIP = "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";
const chipClass = (on: boolean) =>
  `${CHIP} ${on ? "border-teal bg-teal-tint text-teal-deep" : "border-line bg-paper-raised text-ink-muted hover:text-ink"}`;

function ItemCard({
  index,
  total,
  item,
  onText,
  onCfg,
  onKind,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  item: DraftItem;
  onText: (text: string) => void;
  onCfg: (change: Partial<ItemConfig>) => void;
  onKind: (kind: ItemKind) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { cfg } = item;
  const hasFieldChoice = cfg.kind === "TEXTO" || cfg.kind === "DATA" || cfg.kind === "LISTA";

  return (
    <div className="rounded-xl border border-line bg-paper-raised shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-teal-deep">Item {index + 1}</p>
        <div className="flex items-center gap-1 text-ink-muted">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} title="Subir" className="p-1 hover:text-ink disabled:opacity-30">
            <ArrowUp size={15} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} title="Descer" className="p-1 hover:text-ink disabled:opacity-30">
            <ArrowDown size={15} />
          </button>
          <button type="button" onClick={onRemove} title="Remover item" className="p-1 hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Item *</span>
          <input className="input" value={item.text} onChange={(e) => onText(e.target.value)} placeholder="Digite a pergunta ou o que será verificado" />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
            <span className="text-ink-muted">Tipo</span>
            <select className="input" value={cfg.kind} onChange={(e) => onKind(e.target.value as ItemKind)}>
              {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </label>
          {cfg.kind === "AVALIATIVO" && (
            <label className="flex w-40 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Peso *</span>
              <input
                type="number"
                min={0}
                step={1}
                className="input"
                value={cfg.weight}
                onChange={(e) => onCfg({ weight: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">Selecione os complementos desejados.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chipClass(cfg.comment)} onClick={() => onCfg({ comment: !cfg.comment })}>
              <MessageSquare size={14} /> Comentário
            </button>
            <button type="button" className={chipClass(cfg.actionPlan)} onClick={() => onCfg({ actionPlan: !cfg.actionPlan })}>
              <TriangleAlert size={14} /> Plano de Ação
            </button>
            <button type="button" className={chipClass(cfg.attachments)} onClick={() => onCfg({ attachments: !cfg.attachments })}>
              <Paperclip size={14} /> Anexos
            </button>
          </div>
        </div>

        {hasFieldChoice && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink-muted">Selecione o tipo de campo:</p>
            <div className="flex flex-wrap gap-2">
              {cfg.kind === "TEXTO" && (
                <>
                  <button type="button" className={chipClass(cfg.textField === "CURTO")} onClick={() => onCfg({ textField: "CURTO" })}>Texto curto</button>
                  <button type="button" className={chipClass(cfg.textField === "LONGO")} onClick={() => onCfg({ textField: "LONGO" })}>Texto longo</button>
                </>
              )}
              {cfg.kind === "DATA" && (
                <>
                  <button type="button" className={chipClass(cfg.dateField === "HORA")} onClick={() => onCfg({ dateField: "HORA" })}>
                    <Clock size={14} /> Horário (24h)
                  </button>
                  <button type="button" className={chipClass(cfg.dateField === "DATA")} onClick={() => onCfg({ dateField: "DATA" })}>
                    <CalendarDays size={14} /> Data (dd/mm/aaaa)
                  </button>
                </>
              )}
              {cfg.kind === "LISTA" && (
                <>
                  <button type="button" className={chipClass(cfg.listField === "UNICA")} onClick={() => onCfg({ listField: "UNICA" })}>Seleção única</button>
                  <button type="button" className={chipClass(cfg.listField === "MULTIPLA")} onClick={() => onCfg({ listField: "MULTIPLA" })}>Seleção múltipla</button>
                </>
              )}
            </div>
            <FieldPreview cfg={cfg} />
          </div>
        )}

        {cfg.kind === "LISTA" && <OptionsEditor options={cfg.options} onChange={(options) => onCfg({ options })} />}
      </div>
    </div>
  );
}

/** Quadro que mostra como o campo vai aparecer para quem aplica o checklist. */
function FieldPreview({ cfg }: { cfg: ItemConfig }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4 text-sm text-ink-muted">
      {cfg.kind === "TEXTO" &&
        (cfg.textField === "CURTO" ? (
          <input className="input w-full" disabled placeholder="Caixa de texto" />
        ) : (
          <textarea className="input min-h-[90px] w-full" disabled placeholder="Caixa de texto" />
        ))}
      {cfg.kind === "DATA" && (
        <div className="flex flex-wrap items-center gap-3">
          {cfg.dateField === "HORA" ? (
            <label className="flex items-center gap-2"><Clock size={15} /><input className="input w-32" disabled placeholder="HH:MM" /></label>
          ) : (
            <label className="flex items-center gap-2"><CalendarDays size={15} /><input className="input w-40" disabled placeholder="dd/mm/aaaa" /></label>
          )}
        </div>
      )}
      {cfg.kind === "LISTA" && (
        <div className="flex flex-col gap-2">
          {(cfg.options.filter((o) => o.trim()).length ? cfg.options.filter((o) => o.trim()) : ["Opção 1", "Opção 2", "Opção 3"]).map((o, i) => (
            <label key={i} className="flex items-center gap-2 text-ink">
              <input type={cfg.listField === "UNICA" ? "radio" : "checkbox"} disabled /> {o}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  function move(i: number, dir: -1 | 1) {
    const t = i + dir;
    if (t < 0 || t >= options.length) return;
    const next = [...options];
    [next[i], next[t]] = [next[t]!, next[i]!];
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-muted">Lista de opções</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input flex-1"
            value={opt}
            placeholder={`Opção ${i + 1}`}
            onChange={(e) => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
          />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Subir" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"><ArrowUp size={15} /></button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === options.length - 1} title="Descer" className="p-1 text-ink-muted hover:text-ink disabled:opacity-30"><ArrowDown size={15} /></button>
          <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} title="Remover opção" className="p-1 text-ink-muted hover:text-danger"><Trash2 size={15} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, ""])} className="flex w-fit items-center gap-1.5 text-sm font-medium text-teal-deep hover:underline">
        <Plus size={14} /> Adicionar opção
      </button>
    </div>
  );
}
