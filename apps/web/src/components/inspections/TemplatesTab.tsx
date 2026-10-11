import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../../lib/api";
import type { InspectionBlock, InspectionItemType, InspectionTemplate } from "../../lib/types";

const ITEM_TYPE_LABEL: Record<InspectionItemType, string> = {
  CONFORME_NAO_CONFORME: "Conforme / Não conforme",
  SIM_NAO: "Sim / Não",
  NOTA: "Nota",
  TEXTO_LIVRE: "Texto livre",
  SELECAO_MULTIPLA: "Seleção múltipla",
};

interface DraftItem {
  text: string;
  responseType: InspectionItemType;
  options: string[];
  blockLabel?: string;
  category?: string;
  allowPhoto: boolean;
}

function blankItem(): DraftItem {
  return { text: "", responseType: "CONFORME_NAO_CONFORME", options: [], allowPhoto: true };
}

export function TemplatesTab({ companyId }: { companyId?: string }) {
  const [templates, setTemplates] = useState<InspectionTemplate[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InspectionTemplate | null>(null);

  const [blocks, setBlocks] = useState<InspectionBlock[] | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<InspectionBlock | null>(null);

  async function load() {
    const path = companyId ? `/field-ops/inspection-templates?companyId=${encodeURIComponent(companyId)}` : "/field-ops/inspection-templates";
    const list = await api.get<InspectionTemplate[]>(path);
    setTemplates(list);
  }

  async function loadBlocks() {
    const path = companyId ? `/field-ops/inspection-blocks?companyId=${encodeURIComponent(companyId)}` : "/field-ops/inspection-blocks";
    const list = await api.get<InspectionBlock[]>(path);
    setBlocks(list);
  }

  useEffect(() => {
    load();
    loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleDelete(t: InspectionTemplate) {
    if (!window.confirm(`Excluir o roteiro "${t.name}"?`)) return;
    await api.del(`/field-ops/inspection-templates/${t.id}`);
    load();
  }

  async function handleDeleteBlock(b: InspectionBlock) {
    if (!window.confirm(`Excluir o bloco "${b.name}"? Roteiros que já usaram esse bloco não são afetados.`)) return;
    await api.del(`/field-ops/inspection-blocks/${b.id}`);
    loadBlocks();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Roteiros reutilizáveis de inspeção — cada um vira um checklist ao iniciar uma nova inspeção.</p>
        <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo roteiro
        </button>
      </div>

      {showForm && (
        <NewTemplateForm
          companyId={companyId}
          blocks={blocks ?? []}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editing && (
        <EditTemplateForm
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates?.length === 0 && <p className="text-sm text-ink-muted">Nenhum roteiro cadastrado ainda.</p>}
        {templates?.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-ink">{t.name}</p>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setEditing(t)} className="text-ink-muted hover:text-teal-deep" title="Editar roteiro">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(t)} className="text-ink-muted hover:text-danger" title="Excluir roteiro">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {t.category && <p className="mt-0.5 text-xs text-ink-muted">{t.category}</p>}
            <p className="mt-2 text-xs text-ink-muted">{t.items.length} item(ns)</p>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink">Blocos</p>
            <p className="text-sm text-ink-muted">Biblioteca de blocos reutilizáveis — cadastre uma vez e insira em qualquer roteiro novo.</p>
          </div>
          <button className="btn-secondary flex items-center gap-1.5 text-sm" onClick={() => setShowBlockForm(true)}>
            <Plus size={15} /> Novo bloco
          </button>
        </div>

        {showBlockForm && (
          <BlockForm
            companyId={companyId}
            onClose={() => setShowBlockForm(false)}
            onSaved={() => {
              setShowBlockForm(false);
              loadBlocks();
            }}
          />
        )}

        {editingBlock && (
          <BlockForm
            block={editingBlock}
            companyId={companyId}
            onClose={() => setEditingBlock(null)}
            onSaved={() => {
              setEditingBlock(null);
              loadBlocks();
            }}
          />
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blocks?.length === 0 && <p className="text-sm text-ink-muted">Nenhum bloco cadastrado ainda.</p>}
          {blocks?.map((b) => (
            <div key={b.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink">{b.name}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => setEditingBlock(b)} className="text-ink-muted hover:text-teal-deep" title="Editar bloco">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDeleteBlock(b)} className="text-ink-muted hover:text-danger" title="Excluir bloco">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {b.description && <p className="mt-0.5 text-xs text-ink-muted">{b.description}</p>}
              <p className="mt-2 text-xs text-ink-muted">{b.items.length} item(ns)</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditTemplateForm({
  template,
  onClose,
  onSaved,
}: {
  template: InspectionTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [category, setCategory] = useState(template.category ?? "");
  const [description, setDescription] = useState(template.description ?? "");
  const [itemTexts, setItemTexts] = useState<Record<string, string>>(
    Object.fromEntries(template.items.map((it) => [it.id, it.text])),
  );
  const [itemSections, setItemSections] = useState<Record<string, string>>(
    Object.fromEntries(template.items.map((it) => [it.id, it.blockLabel ?? ""])),
  );
  const [itemSubtitles, setItemSubtitles] = useState<Record<string, string>>(
    Object.fromEntries(template.items.map((it) => [it.id, it.category ?? ""])),
  );
  const [itemAllowPhoto, setItemAllowPhoto] = useState<Record<string, boolean>>(
    Object.fromEntries(template.items.map((it) => [it.id, it.allowPhoto])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveItem(itemId: string, overrides?: { allowPhoto?: boolean }) {
    const original = template.items.find((it) => it.id === itemId);
    if (!original) return;
    const text = (itemTexts[itemId] ?? original.text).trim();
    const blockLabel = (itemSections[itemId] ?? original.blockLabel ?? "").trim();
    const category = (itemSubtitles[itemId] ?? original.category ?? "").trim();
    const allowPhoto = overrides?.allowPhoto ?? itemAllowPhoto[itemId] ?? original.allowPhoto;
    if (!text) return;
    if (
      text === original.text &&
      blockLabel === (original.blockLabel ?? "") &&
      category === (original.category ?? "") &&
      allowPhoto === original.allowPhoto
    ) {
      return;
    }
    await api.patch(`/field-ops/inspection-templates/${template.id}/items/${itemId}`, { text, blockLabel, category, allowPhoto });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/field-ops/inspection-templates/${template.id}`, {
        name,
        category: category || undefined,
        description: description || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nome do roteiro</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Categoria</span>
          <input className="input w-40" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: EPI, 5S" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição</span>
        <textarea className="input min-h-[60px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Itens do checklist</span>
        <p className="text-xs text-ink-muted">
          Só título, seção, subtítulo e permissão de foto de cada item podem ser mudados aqui (salva sozinho ao sair do campo) — tipo de resposta e opções ficam travados pra não invalidar inspeções já respondidas. Pra mudar isso, crie um novo roteiro.
        </p>
        {template.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-1 rounded-md border border-line p-2">
            <input
              className="input font-mono text-[10px] uppercase tracking-wide"
              placeholder="Seção (opcional)"
              value={itemSections[item.id] ?? ""}
              onChange={(e) => setItemSections((prev) => ({ ...prev, [item.id]: e.target.value }))}
              onBlur={() => saveItem(item.id)}
            />
            <input
              className="input text-sm"
              placeholder="Subtítulo (opcional)"
              value={itemSubtitles[item.id] ?? ""}
              onChange={(e) => setItemSubtitles((prev) => ({ ...prev, [item.id]: e.target.value }))}
              onBlur={() => saveItem(item.id)}
            />
            <input
              className="input"
              value={itemTexts[item.id] ?? item.text}
              onChange={(e) => setItemTexts((prev) => ({ ...prev, [item.id]: e.target.value }))}
              onBlur={() => saveItem(item.id)}
            />
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={itemAllowPhoto[item.id] ?? item.allowPhoto}
                onChange={(e) => {
                  setItemAllowPhoto((prev) => ({ ...prev, [item.id]: e.target.checked }));
                  saveItem(item.id, { allowPhoto: e.target.checked });
                }}
              />
              Permitir anexar foto
            </label>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || !name} className="btn-primary">
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

function NewTemplateForm({
  companyId,
  blocks,
  onClose,
  onCreated,
}: {
  companyId?: string;
  blocks: InspectionBlock[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [blockToInsert, setBlockToInsert] = useState("");
  const [saving, setSaving] = useState(false);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, blankItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function insertBlock() {
    const block = blocks.find((b) => b.id === blockToInsert);
    if (!block) return;
    setItems((prev) => {
      const base = prev.length === 1 && !prev[0]!.text.trim() ? [] : prev;
      return [
        ...base,
        ...block.items.map((it): DraftItem => ({
          text: it.text,
          responseType: it.responseType,
          options: it.options,
          blockLabel: block.name,
          category: it.category ?? undefined,
          allowPhoto: it.allowPhoto,
        })),
      ];
    });
    setBlockToInsert("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/field-ops/inspection-templates", {
        companyId,
        name,
        category: category || undefined,
        items: items
          .filter((it) => it.text.trim())
          .map((it, order) => ({
            order,
            text: it.text,
            responseType: it.responseType,
            options: it.responseType === "SELECAO_MULTIPLA" ? it.options.filter((o) => o.trim()) : undefined,
            blockLabel: it.blockLabel,
            category: it.category,
            allowPhoto: it.allowPhoto,
          })),
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-ink-muted">Nome do roteiro</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Categoria</span>
          <input className="input w-40" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: EPI, 5S" />
        </label>
      </div>

      {blocks.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-paper-raised p-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-ink-muted">Adicionar bloco da biblioteca</span>
            <select className="input" value={blockToInsert} onChange={(e) => setBlockToInsert(e.target.value)}>
              <option value="">Selecione um bloco…</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.items.length} itens)</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={insertBlock} disabled={!blockToInsert} className="btn-secondary text-sm">
            Inserir
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-sm text-ink-muted">Itens do checklist</span>
        {items.map((item, index) => (
          <ChecklistItemEditor
            key={index}
            item={item}
            index={index}
            onChange={(patch) => updateItem(index, patch)}
            onRemove={() => removeItem(index)}
            canRemove={items.length > 1}
            onMoveUp={() => moveItem(index, -1)}
            onMoveDown={() => moveItem(index, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
            showSection
          />
        ))}
        <button type="button" onClick={addItem} className="flex w-fit items-center gap-1.5 text-xs text-teal-deep hover:underline">
          <Plus size={13} /> Adicionar item
        </button>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving || !name} className="btn-primary">{saving ? "Salvando…" : "Salvar roteiro"}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

function BlockForm({
  block,
  companyId,
  onClose,
  onSaved,
}: {
  block?: InspectionBlock;
  companyId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(block?.name ?? "");
  const [description, setDescription] = useState(block?.description ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    block?.items.length
      ? block.items.map((it): DraftItem => ({ text: it.text, responseType: it.responseType, options: it.options, category: it.category ?? undefined, allowPhoto: it.allowPhoto }))
      : [blankItem()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, blankItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description: description || undefined,
        items: items
          .filter((it) => it.text.trim())
          .map((it, order) => ({
            order,
            text: it.text,
            responseType: it.responseType,
            options: it.responseType === "SELECAO_MULTIPLA" ? it.options.filter((o) => o.trim()) : undefined,
            category: it.category,
            allowPhoto: it.allowPhoto,
          })),
      };
      if (block) {
        await api.patch(`/field-ops/inspection-blocks/${block.id}`, payload);
      } else {
        await api.post("/field-ops/inspection-blocks", { ...payload, companyId });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Nome do bloco</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Descrição</span>
        <textarea className="input min-h-[50px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className="flex flex-col gap-3">
        <span className="text-sm text-ink-muted">Itens do bloco</span>
        {items.map((item, index) => (
          <ChecklistItemEditor
            key={index}
            item={item}
            index={index}
            onChange={(patch) => updateItem(index, patch)}
            onRemove={() => removeItem(index)}
            canRemove={items.length > 1}
            onMoveUp={() => moveItem(index, -1)}
            onMoveDown={() => moveItem(index, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
          />
        ))}
        <button type="button" onClick={addItem} className="flex w-fit items-center gap-1.5 text-xs text-teal-deep hover:underline">
          <Plus size={13} /> Adicionar item
        </button>
      </div>

      {block && (
        <p className="text-xs text-ink-muted">
          Editar os itens aqui não muda roteiros que já usaram este bloco — só afeta o que for inserido a partir de agora.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || !name} className="btn-primary">{saving ? "Salvando…" : "Salvar bloco"}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
  );
}

function ChecklistItemEditor({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  showSection,
}: {
  item: DraftItem;
  index: number;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  showSection?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-paper">
      <div className="h-1 bg-teal-deep" />
      <div className="flex flex-col gap-2 p-3">
        {showSection ? (
          <input
            className="input font-mono text-[10px] uppercase tracking-wide"
            placeholder="Seção (opcional) — ex.: Bloco 1 - Identificação da empresa"
            value={item.blockLabel ?? ""}
            onChange={(e) => onChange({ blockLabel: e.target.value || undefined })}
          />
        ) : (
          item.blockLabel && (
            <p className="font-mono text-[10px] uppercase tracking-wide text-teal-deep">{item.blockLabel}</p>
          )
        )}
        <input
          className="input text-sm"
          placeholder="Subtítulo (opcional) — ex.: Dados Gerais"
          value={item.category ?? ""}
          onChange={(e) => onChange({ category: e.target.value || undefined })}
        />

        <div className="flex items-start gap-2">
          <span className="mt-2 shrink-0 font-mono text-sm text-ink-muted">{index + 1}.</span>
          <div className="min-w-0 flex-1">
            <input
              className="w-full border-0 border-b border-line bg-transparent px-0 py-1.5 text-base font-medium text-ink placeholder:font-normal placeholder:text-ink-muted focus:border-teal-deep focus:outline-none"
              placeholder="Digite a pergunta aqui"
              value={item.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
            <AnswerPreview item={item} onChange={onChange} />
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
            <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="text-ink-muted hover:text-ink disabled:opacity-30">
              <ChevronUp size={15} />
            </button>
            <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="text-ink-muted hover:text-ink disabled:opacity-30">
              <ChevronDown size={15} />
            </button>
            {canRemove && (
              <button type="button" onClick={onRemove} className="text-ink-muted hover:text-danger">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pl-6">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Tipo de resposta
            <select
              className="input h-7 w-auto py-0 text-xs"
              value={item.responseType}
              onChange={(e) => onChange({ responseType: e.target.value as InspectionItemType })}
            >
              {Object.entries(ITEM_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={item.allowPhoto}
              onChange={(e) => onChange({ allowPhoto: e.target.checked })}
            />
            Permitir anexar foto
          </label>
        </div>
      </div>
    </div>
  );
}

/** Mostra a pergunta junto de uma prévia de como a resposta aparece pro inspetor —
 * pra Seleção múltipla a prévia É o editor de opções (edita e já vê como fica). */
function AnswerPreview({ item, onChange }: { item: DraftItem; onChange: (patch: Partial<DraftItem>) => void }) {
  switch (item.responseType) {
    case "TEXTO_LIVRE":
      return (
        <textarea className="input mt-2 w-full resize-none bg-paper-raised text-ink-muted" rows={2} placeholder="Resposta em texto longo" disabled />
      );
    case "NOTA":
      return <input className="input mt-2 w-full bg-paper-raised text-ink-muted" placeholder="Resposta em texto curto" disabled />;
    case "SIM_NAO":
      return (
        <div className="mt-2 flex gap-2">
          {["Sim", "Não"].map((label) => (
            <span key={label} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-line" /> {label}
            </span>
          ))}
        </div>
      );
    case "CONFORME_NAO_CONFORME":
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {["Conforme", "Não conforme", "N/A"].map((label) => (
            <span key={label} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-line" /> {label}
            </span>
          ))}
        </div>
      );
    case "SELECAO_MULTIPLA":
      return <OptionsEditor options={item.options} onChange={(options) => onChange({ options })} />;
  }
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  function updateOption(index: number, value: string) {
    onChange(options.map((o, i) => (i === index ? value : o)));
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function addOption() {
    onChange([...options, ""]);
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="h-4 w-4 shrink-0 rounded border border-line" />
          <input
            className="flex-1 border-0 border-b border-line bg-transparent px-0 py-1 text-sm text-ink focus:border-teal-deep focus:outline-none"
            placeholder={`Opção ${index + 1}`}
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
          />
          <button type="button" onClick={() => removeOption(index)} className="text-ink-muted hover:text-danger">
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addOption} className="flex w-fit items-center gap-1.5 pl-6 text-xs text-teal-deep hover:underline">
        <Plus size={12} /> Adicionar opção
      </button>
    </div>
  );
}
